import uuid
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..services import ediscovery_service
from ..dependencies.auth import get_current_user, check_role
from ..models.user import User

router = APIRouter(prefix="/ediscovery", tags=["ediscovery"])


class CaseCreate(BaseModel):
    title: str
    description: str
    query_keywords: List[str]


# ---------------------------------------------------------------------------
# Case Workspace
# ---------------------------------------------------------------------------

@router.post("/cases")
async def create_case(
    case_in: CaseCreate,
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER", "AUDITOR"]))
):
    """Initialize a new e-Discovery case workspace."""
    case = ediscovery_service.create_case(
        title=case_in.title,
        description=case_in.description,
        query_keywords=case_in.query_keywords,
        created_by=str(current_user.id)
    )
    return case


@router.get("/cases")
async def list_cases(
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER", "AUDITOR"]))
):
    """List all active e-Discovery cases."""
    return ediscovery_service.list_cases()


@router.get("/cases/{case_id}")
async def get_case(
    case_id: str,
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER", "AUDITOR"]))
):
    """Get a specific case."""
    case = ediscovery_service.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.post("/cases/{case_id}/scan-and-hold")
async def scan_and_hold(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    """
    Run keyword scan for the case, apply bulk legal hold on matched records,
    and update case status.
    """
    try:
        result = await ediscovery_service.scan_and_apply_hold(db, case_id, current_user.id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cases/{case_id}/export-zip")
async def export_case_zip(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER", "AUDITOR"]))
):
    """
    Generate the forensic ZIP archive for a case (records + audit chain + manifest).
    """
    case = ediscovery_service.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if not case["matched_record_ids"]:
        raise HTTPException(status_code=400, detail="No records matched. Run scan-and-hold first.")

    record_ids = [uuid.UUID(rid) for rid in case["matched_record_ids"]]
    zip_buffer = await ediscovery_service.generate_ediscovery_zip(db, record_ids, case_id=case_id)

    return StreamingResponse(
        zip_buffer,
        media_type="application/x-zip-compressed",
        headers={"Content-Disposition": f"attachment; filename=ediscovery_case_{case_id[:8]}.zip"}
    )


# ---------------------------------------------------------------------------
# Legacy: direct record selection export
# ---------------------------------------------------------------------------

@router.post("/export-zip")
async def export_zip(
    record_ids: List[uuid.UUID] = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export selected records to a forensic ZIP (direct record selection)."""
    if not record_ids:
        raise HTTPException(status_code=400, detail="No records selected")

    zip_buffer = await ediscovery_service.generate_ediscovery_zip(db, record_ids)

    return StreamingResponse(
        zip_buffer,
        media_type="application/x-zip-compressed",
        headers={"Content-Disposition": f"attachment; filename=ediscovery_export_{uuid.uuid4().hex[:8]}.zip"}
    )
