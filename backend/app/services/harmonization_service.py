"""
Data Harmonization Agent Service.

Uses LLM (Gemini) to clean and standardize bulk import data:
- Resolves department/entity name variations to canonical master values
- Flags date format inconsistencies
- Standardizes casing and whitespace
- Returns a diff for user review before committing to database
"""
import os
import json
import logging
import httpx
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models.master import Entity, Department
from ..config import settings

logger = logging.getLogger("app.services.harmonization_service")


async def get_master_values(db: AsyncSession) -> Dict[str, List[str]]:
    """Fetch canonical entity and department names from master data."""
    entities_result = await db.execute(select(Entity.name).where(Entity.is_active == True))
    departments_result = await db.execute(select(Department.name).where(Department.is_active == True))

    return {
        "entities": [r[0] for r in entities_result.all()],
        "departments": [r[0] for r in departments_result.all()]
    }


async def harmonize_with_llm(
    rows: List[Dict[str, Any]],
    master_values: Dict[str, List[str]]
) -> Optional[List[Dict[str, Any]]]:
    """
    Send rows to Gemini for harmonization. Returns corrected rows.
    Falls back to rule-based harmonization if LLM unavailable.
    """
    gemini_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return None

    prompt = f"""You are a data harmonization assistant for an inventory records system.

Master entity names: {json.dumps(master_values['entities'])}
Master department names: {json.dumps(master_values['departments'])}

Here are CSV rows to harmonize (JSON array):
{json.dumps(rows[:20], indent=2)}

For each row:
1. Correct the "entity" field to exactly match one of the master entity names (or keep as-is if no close match)
2. Correct the "department" field to exactly match one of the master department names (or keep as-is if no close match)
3. Fix obvious date format issues in "record_date" to YYYY-MM-DD format
4. Fix capitalization inconsistencies in text fields

Return a valid JSON array of the corrected rows.
"""

    # Use model cascade fallback starting with gemini-2.5-pro to ensure service liveness
    for model_name in ["gemini-2.5-pro", "gemini-1.5-pro", "gemini-2.5-flash", "gemini-1.5-flash"]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1, 
                "maxOutputTokens": 4096,
                "responseMimeType": "application/json"
            }
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text.strip())
            else:
                logger.warning(f"LLM harmonization with {model_name} failed: Status {resp.status_code}, Response: {resp.text}")
        except Exception as e:
            logger.error(f"LLM harmonization failed for model {model_name}: {e}")

    return None


def rule_based_harmonize(
    rows: List[Dict[str, Any]],
    master_values: Dict[str, List[str]]
) -> List[Dict[str, Any]]:
    """
    Fallback: rule-based normalization using fuzzy string matching.
    Resolves common variations like 'Fin', 'FINANCE', 'Finances' → 'Finance'.
    """
    def best_match(value: str, candidates: List[str]) -> str:
        if not value or not candidates:
            return value
        v_lower = value.lower().strip()
        # Exact match
        for c in candidates:
            if c.lower() == v_lower:
                return c
        # Starts-with match
        for c in candidates:
            if c.lower().startswith(v_lower) or v_lower.startswith(c.lower()):
                return c
        # Contains match
        for c in candidates:
            if v_lower in c.lower() or c.lower() in v_lower:
                return c
        return value  # No match found, return as-is

    import re
    corrected = []
    for row in rows:
        r = dict(row)
        if "entity" in r and r["entity"]:
            r["entity"] = best_match(r["entity"], master_values["entities"])
        if "department" in r and r["department"]:
            r["department"] = best_match(r["department"], master_values["departments"])
        # Fix date format
        if "record_date" in r and r["record_date"]:
            date_str = str(r["record_date"]).strip()
            # Try common formats: DD/MM/YYYY, MM-DD-YYYY
            for pattern, replacement in [
                (r"^(\d{2})/(\d{2})/(\d{4})$", r"\3-\2-\1"),
                (r"^(\d{2})-(\d{2})-(\d{4})$", r"\3-\2-\1"),
            ]:
                if re.match(pattern, date_str):
                    date_str = re.sub(pattern, replacement, date_str)
                    break
            r["record_date"] = date_str
        corrected.append(r)
    return corrected


def compute_diff(original: List[Dict], corrected: List[Dict]) -> List[Dict]:
    """Compute field-level diff between original and corrected rows."""
    diffs = []
    for i, (orig, corr) in enumerate(zip(original, corrected)):
        changes = {}
        for key in set(list(orig.keys()) + list(corr.keys())):
            o_val = orig.get(key, "")
            c_val = corr.get(key, "")
            if str(o_val) != str(c_val):
                changes[key] = {"original": o_val, "corrected": c_val}
        diffs.append({
            "row_index": i,
            "has_changes": bool(changes),
            "changes": changes,
            "corrected_row": corr
        })
    return diffs


async def harmonize_rows(
    db: AsyncSession,
    rows: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Main entry point: harmonize a batch of rows and return diff for user review.
    """
    master_values = await get_master_values(db)

    # Try LLM first, fall back to rule-based
    corrected = await harmonize_with_llm(rows, master_values)
    method = "llm"
    if corrected is None or len(corrected) != len(rows):
        corrected = rule_based_harmonize(rows, master_values)
        method = "rule_based"

    diffs = compute_diff(rows, corrected)
    changed_count = sum(1 for d in diffs if d["has_changes"])

    return {
        "method": method,
        "total_rows": len(rows),
        "changed_rows": changed_count,
        "unchanged_rows": len(rows) - changed_count,
        "diffs": diffs,
        "master_values": master_values
    }
