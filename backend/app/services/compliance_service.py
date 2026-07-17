"""
compliance_service.py
RAG-Based Compliance Advisor Service

Flow:
  1. User submits a natural-language query (+ optional record_type hint).
  2. We embed the query with Gemini text-embedding-004.
  3. We rank stored CompliancePolicy rows by cosine similarity.
  4. We pass the top-K chunks as context to Gemini (gemini-2.5-flash / 1.5-flash).
  5. LLM returns:
       - A narrative answer with inline citations
       - A structured JSON block with suggested retention years + citation list
  6. We persist the query + response in compliance_queries for audit.
"""

import json
import logging
import uuid
import httpx
import math
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from ..config import settings
from ..models.compliance import CompliancePolicy, ComplianceQuery

logger = logging.getLogger("app.services.compliance_service")

# ---------------------------------------------------------------------------
# Embedding helpers
# ---------------------------------------------------------------------------

async def _get_embedding(text: str) -> Optional[List[float]]:
    """Call Gemini text-embedding-004 for a text string."""
    key = settings.GEMINI_API_KEY
    if not key:
        return None
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/"
        f"models/text-embedding-004:embedContent?key={key}"
    )
    payload = {
        "model": "models/text-embedding-004",
        "content": {"parts": [{"text": text[:20000]}]},
    }
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(url, json=payload)
        if resp.status_code == 200:
            return resp.json()["embedding"]["values"]
        logger.error("Embedding API error %s: %s", resp.status_code, resp.text[:300])
    except Exception as exc:
        logger.error("Embedding exception: %s", exc)
    return None


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# ---------------------------------------------------------------------------
# Policy CRUD
# ---------------------------------------------------------------------------

async def list_policies(db: AsyncSession) -> List[Dict]:
    result = await db.execute(
        select(CompliancePolicy).where(CompliancePolicy.is_active == True).order_by(CompliancePolicy.created_at.desc())
    )
    policies = result.scalars().all()
    return [_policy_to_dict(p) for p in policies]


async def get_policy(db: AsyncSession, policy_id: uuid.UUID) -> Optional[Dict]:
    result = await db.execute(select(CompliancePolicy).where(CompliancePolicy.id == policy_id))
    p = result.scalar_one_or_none()
    return _policy_to_dict(p) if p else None


async def create_policy(
    db: AsyncSession,
    title: str,
    content: str,
    source: Optional[str] = None,
    jurisdiction: Optional[str] = None,
    category: Optional[str] = None,
    applicable_record_types: Optional[List[str]] = None,
    retention_years: Optional[int] = None,
    effective_date: Optional[str] = None,
    summary: Optional[str] = None,
) -> Dict:
    """Create a policy and immediately generate its embedding."""
    # Auto-generate summary if not provided
    if not summary and content:
        summary = content[:200].strip() + ("..." if len(content) > 200 else "")

    embedding = await _get_embedding(f"{title}. {content[:2000]}")

    policy = CompliancePolicy(
        title=title,
        content=content,
        source=source,
        jurisdiction=jurisdiction,
        category=category,
        applicable_record_types=applicable_record_types or [],
        retention_years=retention_years,
        effective_date=effective_date,
        summary=summary,
        embedding=embedding,
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    logger.info("Created compliance policy '%s' (id=%s)", title, policy.id)
    return _policy_to_dict(policy)


async def delete_policy(db: AsyncSession, policy_id: uuid.UUID) -> bool:
    result = await db.execute(select(CompliancePolicy).where(CompliancePolicy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        return False
    policy.is_active = False
    await db.commit()
    return True


async def backfill_policy_embeddings(db: AsyncSession) -> int:
    """Generate embeddings for policies that are missing them."""
    result = await db.execute(
        select(CompliancePolicy).where(
            CompliancePolicy.is_active == True,
            CompliancePolicy.embedding == None,
        )
    )
    policies = result.scalars().all()
    count = 0
    for p in policies:
        emb = await _get_embedding(f"{p.title}. {p.content[:2000]}")
        if emb:
            p.embedding = emb
            count += 1
    if count:
        await db.commit()
        logger.info("Backfilled embeddings for %d compliance policies", count)
    return count


# ---------------------------------------------------------------------------
# RAG Query
# ---------------------------------------------------------------------------

async def run_compliance_query(
    db: AsyncSession,
    user_id: uuid.UUID,
    query_text: str,
    record_type_hint: Optional[str] = None,
    top_k: int = 5,
) -> Dict[str, Any]:
    """
    Core RAG pipeline:
      embed query → retrieve top_k policies → call Gemini → parse + persist.
    """
    # 1. Embed the query
    query_embedding = await _get_embedding(query_text)

    # 2. Retrieve active policies
    result = await db.execute(
        select(CompliancePolicy).where(CompliancePolicy.is_active == True)
    )
    all_policies = result.scalars().all()

    # 3. Rank by cosine similarity (if embeddings available)
    ranked: List[tuple] = []
    for p in all_policies:
        if query_embedding and p.embedding:
            score = _cosine_similarity(query_embedding, p.embedding)
        else:
            # Keyword fallback: count query terms in content
            terms = query_text.lower().split()
            content_lower = (p.content or "").lower() + " " + (p.title or "").lower()
            score = sum(1 for t in terms if t in content_lower) / max(len(terms), 1)
        ranked.append((score, p))

    ranked.sort(key=lambda x: x[0], reverse=True)
    top_policies = [p for _, p in ranked[:top_k] if _ > 0]

    # If nothing matches, use top-K regardless
    if not top_policies and all_policies:
        top_policies = [p for _, p in ranked[:top_k]]

    # 4. Build context for LLM
    citations_raw: List[Dict] = []
    context_blocks: List[str] = []
    for idx, p in enumerate(top_policies, 1):
        citations_raw.append({
            "id": str(p.id),
            "title": p.title,
            "source": p.source,
            "jurisdiction": p.jurisdiction,
            "category": p.category,
            "retention_years": p.retention_years,
            "summary": p.summary,
            "excerpt": p.content[:600],
        })
        context_blocks.append(
            f"[Policy {idx}] {p.title} ({p.source or 'N/A'}, {p.jurisdiction or 'N/A'})\n"
            f"Category: {p.category or 'N/A'} | Retention: {p.retention_years or 'N/A'} years\n"
            f"Content: {p.content[:800]}"
        )

    context_text = "\n\n---\n\n".join(context_blocks) if context_blocks else "No specific policies found."

    record_hint_text = f" The user is asking about records of type: **{record_type_hint}**." if record_type_hint else ""

    system_prompt = f"""You are a Compliance Advisor for a physical records inventory management system used in the UAE and the GCC region.
Your role: Answer retention, legal, and compliance questions using ONLY the provided policy context.
{record_hint_text}

**Output Format — You MUST respond with valid JSON only, no markdown fences, no extra text:**
{{
  "narrative": "<Detailed 3-5 paragraph answer with inline references like [Policy 1], [Policy 2]>",
  "suggested_retention_years": <integer or null if unclear>,
  "confidence": "<HIGH|MEDIUM|LOW>",
  "key_takeaways": ["<takeaway 1>", "<takeaway 2>", "<takeaway 3>"],
  "citations_used": [1, 2]
}}

Policy Context:
{context_text}

User Query: {query_text}"""

    ai_response_text, parsed_result = await _call_gemini(system_prompt)

    # 5. Build final citations list (only cited ones)
    cited_indices = parsed_result.get("citations_used", list(range(1, len(citations_raw) + 1)))
    final_citations = []
    for idx in cited_indices:
        if 1 <= idx <= len(citations_raw):
            final_citations.append(citations_raw[idx - 1])

    # If parsing failed, include all top policies as citations
    if not final_citations:
        final_citations = citations_raw

    suggested_years = parsed_result.get("suggested_retention_years")

    # 6. Persist query audit record
    query_record = ComplianceQuery(
        user_id=user_id,
        query_text=query_text,
        record_type_hint=record_type_hint,
        ai_response=parsed_result.get("narrative", ai_response_text),
        citations=final_citations,
        suggested_retention_years=suggested_years,
    )
    db.add(query_record)
    await db.commit()
    await db.refresh(query_record)

    return {
        "id": str(query_record.id),
        "query_text": query_text,
        "narrative": parsed_result.get("narrative", ai_response_text),
        "suggested_retention_years": suggested_years,
        "confidence": parsed_result.get("confidence", "LOW"),
        "key_takeaways": parsed_result.get("key_takeaways", []),
        "citations": final_citations,
        "policies_searched": len(all_policies),
        "created_at": query_record.created_at.isoformat() if query_record.created_at else None,
    }


async def list_query_history(db: AsyncSession, user_id: uuid.UUID, limit: int = 20) -> List[Dict]:
    result = await db.execute(
        select(ComplianceQuery)
        .where(ComplianceQuery.user_id == user_id)
        .order_by(ComplianceQuery.created_at.desc())
        .limit(limit)
    )
    queries = result.scalars().all()
    return [_query_to_dict(q) for q in queries]


# ---------------------------------------------------------------------------
# Gemini LLM caller with model cascade
# ---------------------------------------------------------------------------

GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
]

async def _call_gemini(prompt: str) -> tuple[str, Dict]:
    key = settings.GEMINI_API_KEY
    if not key:
        fallback = '{"narrative": "AI is not configured. Please add a GEMINI_API_KEY.", "suggested_retention_years": null, "confidence": "LOW", "key_takeaways": [], "citations_used": []}'
        return fallback, json.loads(fallback)

    for model in GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048,
            },
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Strip possible markdown fences
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("```")[1]
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:]
                    raw_text = raw_text.strip()
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3].strip()
                try:
                    parsed = json.loads(raw_text)
                    return raw_text, parsed
                except json.JSONDecodeError:
                    logger.warning("Model %s returned non-JSON: %s", model, raw_text[:200])
                    return raw_text, {"narrative": raw_text, "suggested_retention_years": None, "confidence": "LOW", "key_takeaways": [], "citations_used": []}
            else:
                logger.warning("Model %s responded %s", model, resp.status_code)
        except Exception as exc:
            logger.warning("Model %s exception: %s", model, exc)

    fallback_text = "All AI models timed out. Please try again later."
    return fallback_text, {"narrative": fallback_text, "suggested_retention_years": None, "confidence": "LOW", "key_takeaways": [], "citations_used": []}


# ---------------------------------------------------------------------------
# Serialisers
# ---------------------------------------------------------------------------

def _policy_to_dict(p: CompliancePolicy) -> Dict:
    return {
        "id": str(p.id),
        "title": p.title,
        "source": p.source,
        "jurisdiction": p.jurisdiction,
        "category": p.category,
        "applicable_record_types": p.applicable_record_types or [],
        "retention_years": p.retention_years,
        "effective_date": p.effective_date,
        "summary": p.summary,
        "content": p.content,
        "has_embedding": p.embedding is not None,
        "is_active": p.is_active,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _query_to_dict(q: ComplianceQuery) -> Dict:
    return {
        "id": str(q.id),
        "query_text": q.query_text,
        "record_type_hint": q.record_type_hint,
        "ai_response": q.ai_response,
        "citations": q.citations or [],
        "suggested_retention_years": q.suggested_retention_years,
        "created_at": q.created_at.isoformat() if q.created_at else None,
    }


# ---------------------------------------------------------------------------
# Seed helper — built-in GCC/UAE retention policies
# ---------------------------------------------------------------------------

SEED_POLICIES = [
    {
        "title": "UAE Commercial Companies Law – Financial Records Retention",
        "source": "Federal Law No. 2 of 2015 (UAE CCL)",
        "jurisdiction": "UAE",
        "category": "Financial",
        "applicable_record_types": ["Financial Records", "Accounting", "Invoices"],
        "retention_years": 5,
        "effective_date": "2015-04-01",
        "summary": "UAE Commercial Companies Law mandates keeping financial and accounting records for a minimum of 5 years.",
        "content": (
            "Pursuant to Federal Law No. 2 of 2015 (UAE Commercial Companies Law), Article 26, "
            "all companies operating in the UAE are required to maintain proper books of accounts, "
            "financial statements, and commercial records for a minimum period of five (5) years "
            "from the end of the relevant financial year. This includes invoices, receipts, bank "
            "statements, and any other financial documentation. Failure to comply may result in "
            "regulatory penalties and loss of commercial license. The law applies to all entities "
            "registered with the Department of Economic Development across all emirates."
        ),
    },
    {
        "title": "UAE VAT Law – Tax Records and Invoice Retention",
        "source": "Federal Decree-Law No. 8 of 2017 (UAE VAT Law), Article 78",
        "jurisdiction": "UAE",
        "category": "Tax",
        "applicable_record_types": ["Tax Records", "Invoices", "Financial Records"],
        "retention_years": 5,
        "effective_date": "2018-01-01",
        "summary": "UAE VAT registrants must retain tax invoices, credit notes, debit notes and associated records for 5 years.",
        "content": (
            "Article 78 of the UAE VAT Law (Federal Decree-Law No. 8 of 2017) requires that "
            "Taxable Persons retain all records related to VAT for a minimum of five (5) years "
            "after the end of the Tax Period to which they relate. Records include: tax invoices "
            "issued and received, credit notes and debit notes, accounting books showing VAT "
            "collected and paid, import and export documentation, VAT returns and supporting "
            "calculations. Real estate businesses must retain records for fifteen (15) years. "
            "Records must be retained in Arabic or with Arabic translation if they are in another language."
        ),
    },
    {
        "title": "UAE Personal Data Protection Law (PDPL) – Data Retention Limits",
        "source": "Federal Decree-Law No. 45 of 2021 (UAE PDPL)",
        "jurisdiction": "UAE",
        "category": "Data Protection",
        "applicable_record_types": ["HR Records", "Employee Data", "Customer Data", "Personal Files"],
        "retention_years": 3,
        "effective_date": "2022-01-02",
        "summary": "Personal data must not be retained beyond 3 years unless required by another legal obligation.",
        "content": (
            "The UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021) establishes "
            "that personal data shall only be retained for the period necessary to fulfil the purpose "
            "for which it was collected, and shall not exceed three (3) years after the end of the "
            "processing purpose unless retention is required by other applicable laws or regulations. "
            "Data controllers must implement appropriate technical and organisational measures to "
            "ensure data is securely deleted or anonymised when the retention period expires. "
            "Special categories of sensitive data (health, biometric, financial) require explicit "
            "justification for extended retention. Violations are subject to fines up to AED 5 million."
        ),
    },
    {
        "title": "UAE Labour Law – Employee Records and HR Files Retention",
        "source": "Federal Decree-Law No. 33 of 2021 (UAE Labour Law)",
        "jurisdiction": "UAE",
        "category": "Human Resources",
        "applicable_record_types": ["HR Records", "Employee Files", "Payroll", "Contracts"],
        "retention_years": 5,
        "effective_date": "2022-02-02",
        "summary": "Employee records, contracts, and payroll documents must be retained for 5 years after employment ends.",
        "content": (
            "Under the UAE Federal Decree-Law No. 33 of 2021 on the Regulation of Labour Relations, "
            "employers are required to maintain comprehensive employee files including employment "
            "contracts, wage records, leave entitlements, disciplinary actions, and termination "
            "documents for a period of five (5) years from the date of termination of employment "
            "or resolution of any employment disputes. Payroll records including salary slips, "
            "overtime payments, and end-of-service gratuity calculations must be similarly preserved. "
            "The Ministry of Human Resources and Emiratisation (MOHRE) may request these records "
            "during labour inspections or dispute resolution proceedings."
        ),
    },
    {
        "title": "Saudi Arabia ZATCA – Financial Record Retention Requirements",
        "source": "Saudi Arabia Zakat, Tax and Customs Authority (ZATCA) Guidelines",
        "jurisdiction": "Saudi Arabia",
        "category": "Tax",
        "applicable_record_types": ["Financial Records", "Tax Records", "Invoices"],
        "retention_years": 10,
        "effective_date": "2020-01-01",
        "summary": "Saudi entities subject to Zakat and VAT must keep records for 10 years.",
        "content": (
            "The Zakat, Tax and Customs Authority (ZATCA) of the Kingdom of Saudi Arabia requires "
            "all taxable persons and zakat payers to maintain their financial records, books of "
            "accounts, and supporting documentation for a minimum period of ten (10) years from "
            "the end of the financial year. This requirement applies to both VAT records (invoices, "
            "credit notes, import records) and Zakat assessments. E-invoices generated through the "
            "Fatoorah e-invoicing system must be retained in their original electronic format. "
            "Penalties for non-retention include fines up to SAR 50,000 per violation."
        ),
    },
    {
        "title": "DIFC Data Protection Law – Records of Processing Activities",
        "source": "DIFC Law No. 5 of 2020 (DIFC DPL 2020)",
        "jurisdiction": "DIFC (UAE)",
        "category": "Data Protection",
        "applicable_record_types": ["Personal Data", "Processing Records", "Consent Records"],
        "retention_years": 6,
        "effective_date": "2020-10-01",
        "summary": "DIFC entities must retain records of processing activities and consent for 6 years.",
        "content": (
            "The Dubai International Financial Centre (DIFC) Data Protection Law (DIFC Law No. 5 "
            "of 2020) requires Controllers and Processors to maintain Records of Processing "
            "Activities (RoPAs) for six (6) years after the cessation of processing or the end "
            "of the relevant contract. Consent records, privacy notices, data transfer agreements, "
            "and data processing agreements must be retained for the same period. The Commissioner "
            "of Data Protection may request these records at any time during and after the "
            "retention period. Non-compliance may result in fines up to USD 100,000."
        ),
    },
    {
        "title": "GCC Archive and Records Management Standard",
        "source": "GCC Standardization Organization (GSO) – Records Management Best Practice",
        "jurisdiction": "GCC",
        "category": "Records Management",
        "applicable_record_types": ["All Record Types", "Physical Files", "Digital Archives"],
        "retention_years": 7,
        "effective_date": "2019-01-01",
        "summary": "GCC standard recommends 7-year baseline retention for general corporate records.",
        "content": (
            "The GCC Standardization Organization (GSO) records management guidelines recommend "
            "a baseline retention period of seven (7) years for general corporate records including "
            "correspondence, meeting minutes, contracts, project files, and administrative documents. "
            "Records of permanent value (e.g. incorporation documents, board resolutions, property "
            "titles) should be retained indefinitely. The standard encourages digital preservation "
            "with hash-based integrity verification, hierarchical classification, and periodic "
            "disposition reviews by certified records officers. Physical records should be stored "
            "in fire-resistant, climate-controlled facilities with appropriate access controls."
        ),
    },
    {
        "title": "ADGM Data Protection Regulations – Retention and Deletion",
        "source": "Abu Dhabi Global Market (ADGM) Data Protection Regulations 2021",
        "jurisdiction": "ADGM (UAE)",
        "category": "Data Protection",
        "applicable_record_types": ["Customer Data", "HR Records", "Financial Records"],
        "retention_years": 5,
        "effective_date": "2021-11-14",
        "summary": "ADGM regulations require personal data to be deleted after 5 years unless extended retention applies.",
        "content": (
            "The Abu Dhabi Global Market (ADGM) Data Protection Regulations 2021 require that "
            "personal data is retained only for as long as is necessary for the purposes for "
            "which it was processed. In practice, ADGM-registered entities apply a maximum "
            "retention period of five (5) years for customer and employee personal data after "
            "the end of the business relationship, subject to applicable legal holds or other "
            "regulatory requirements. Controllers must maintain a data retention schedule and "
            "implement automated deletion or anonymisation workflows. Annual compliance reviews "
            "are mandatory for entities processing sensitive personal data categories."
        ),
    },
    {
        "title": "UAE Anti-Money Laundering Law – KYC and Transaction Record Retention",
        "source": "Federal Decree-Law No. 20 of 2018 (UAE AML Law), Article 14",
        "jurisdiction": "UAE",
        "category": "Compliance & AML",
        "applicable_record_types": ["KYC Records", "Transaction Records", "Financial Records"],
        "retention_years": 5,
        "effective_date": "2018-10-30",
        "summary": "KYC documents and transaction records must be retained for 5 years after the business relationship ends.",
        "content": (
            "Article 14 of the UAE Federal Decree-Law No. 20 of 2018 on Anti-Money Laundering "
            "(AML) and Combating the Financing of Terrorism (CFT) requires that all Financial "
            "Institutions and Designated Non-Financial Businesses and Professions (DNFBPs) "
            "retain customer identification documents (KYC), business relationship records, "
            "and transaction records for a minimum period of five (5) years following the "
            "termination of the business relationship or the execution of the transaction. "
            "Records of suspicious transaction reports (STRs) must also be retained for the "
            "same period. Failure to comply may result in criminal penalties and revocation "
            "of operating licenses by the Central Bank of the UAE."
        ),
    },
    {
        "title": "ISO 15489 – International Standard for Records Management",
        "source": "ISO 15489-1:2016 Information and Documentation – Records Management",
        "jurisdiction": "International",
        "category": "Records Management",
        "applicable_record_types": ["All Record Types"],
        "retention_years": None,
        "effective_date": "2016-04-15",
        "summary": "International framework for records lifecycle management including classification, retention scheduling and disposal.",
        "content": (
            "ISO 15489-1:2016 provides a framework for managing records in all formats and media "
            "throughout their lifecycle, from creation or receipt through processing, distribution, "
            "maintenance and use, to ultimate disposition. Key principles include: (1) Records "
            "must be authentic – created by the attributed person at the stated time; (2) Records "
            "must be reliable – accurately representing the business activity; (3) Records must be "
            "integral – complete and unaltered; (4) Records must be usable – located, retrieved, "
            "presented and interpreted. Retention schedules must be developed based on business "
            "value, legal requirements, regulatory mandates, and historical significance. The "
            "standard emphasises cryptographic integrity verification and chain-of-custody "
            "documentation for records subject to legal proceedings."
        ),
    },
]


async def seed_default_policies(db: AsyncSession) -> int:
    """Seed the database with built-in UAE/GCC compliance policies if empty."""
    result = await db.execute(
        select(CompliancePolicy).where(CompliancePolicy.is_active == True).limit(1)
    )
    existing = result.scalar_one_or_none()
    if existing:
        logger.info("Compliance policies already seeded, skipping.")
        return 0

    count = 0
    for pol_data in SEED_POLICIES:
        embedding = await _get_embedding(f"{pol_data['title']}. {pol_data['content'][:2000]}")
        policy = CompliancePolicy(
            **pol_data,
            embedding=embedding,
        )
        db.add(policy)
        count += 1

    await db.commit()
    logger.info("Seeded %d compliance policies.", count)
    return count
