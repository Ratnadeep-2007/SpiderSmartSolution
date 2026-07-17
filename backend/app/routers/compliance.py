"""
compliance.py – FastAPI router for the RAG-Based Compliance Advisor.

Endpoints:
  GET    /compliance/policies              List all compliance policies
  POST   /compliance/policies              Add a new policy document
  GET    /compliance/policies/{id}         Get a single policy
  DELETE /compliance/policies/{id}         Soft-delete a policy
  POST   /compliance/policies/seed         Seed built-in UAE/GCC policies
  POST   /compliance/query                 Run a RAG query (main advisor)
  GET    /compliance/history               Query history for current user
"""

import uuid
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies.auth import get_current_user, check_role
from ..models.user import User
from ..services import compliance_service

router = APIRouter(prefix="/compliance", tags=["compliance"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class PolicyCreate(BaseModel):
    title: str
    content: str
    source: Optional[str] = None
    jurisdiction: Optional[str] = None
    category: Optional[str] = None
    applicable_record_types: Optional[List[str]] = []
    retention_years: Optional[int] = None
    effective_date: Optional[str] = None
    summary: Optional[str] = None


class ComplianceQueryRequest(BaseModel):
    query: str
    record_type_hint: Optional[str] = None
    top_k: int = 5


# ---------------------------------------------------------------------------
# Policy management endpoints
# ---------------------------------------------------------------------------

@router.get("/policies")
async def list_policies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all active compliance policy documents."""
    return await compliance_service.list_policies(db)


@router.get("/policies/{policy_id}")
async def get_policy(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch a single policy by ID."""
    policy = await compliance_service.get_policy(db, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


@router.post("/policies")
async def create_policy(
    body: PolicyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"])),
):
    """Add a new compliance policy document to the knowledge base."""
    return await compliance_service.create_policy(
        db,
        title=body.title,
        content=body.content,
        source=body.source,
        jurisdiction=body.jurisdiction,
        category=body.category,
        applicable_record_types=body.applicable_record_types,
        retention_years=body.retention_years,
        effective_date=body.effective_date,
        summary=body.summary,
    )


@router.delete("/policies/{policy_id}")
async def delete_policy(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN"])),
):
    """Soft-delete a compliance policy."""
    deleted = await compliance_service.delete_policy(db, policy_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Policy not found")
    return {"detail": "Policy deleted"}


@router.post("/policies/seed")
async def seed_policies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN"])),
):
    """Seed the knowledge base with built-in UAE/GCC regulatory policies."""
    count = await compliance_service.seed_default_policies(db)
    return {"seeded": count, "message": f"Seeded {count} compliance policies successfully."}


@router.post("/policies/backfill-embeddings")
async def backfill_embeddings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN"])),
):
    """Generate embeddings for policies that are missing them."""
    count = await compliance_service.backfill_policy_embeddings(db)
    return {"updated": count}


# ---------------------------------------------------------------------------
# Main RAG query endpoint
# ---------------------------------------------------------------------------

@router.post("/query")
async def run_query(
    body: ComplianceQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a compliance question.
    The service will:
      1. Embed the query with Gemini text-embedding-004
      2. Retrieve the most relevant policies from the knowledge base
      3. Pass them to Gemini as context (RAG)
      4. Return a structured answer with citations and suggested retention years
    """
    if not body.query.strip():
        raise HTTPException(status_code=400, detail="Query text is required")

    result = await compliance_service.run_compliance_query(
        db=db,
        user_id=current_user.id,
        query_text=body.query,
        record_type_hint=body.record_type_hint,
        top_k=body.top_k,
    )
    return result


# ---------------------------------------------------------------------------
# Query history
# ---------------------------------------------------------------------------

@router.get("/history")
async def get_query_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the current user's recent compliance queries."""
    return await compliance_service.list_query_history(db, current_user.id)
