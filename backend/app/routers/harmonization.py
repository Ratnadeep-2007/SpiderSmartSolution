"""
Data Harmonization Agent Router.

Endpoints:
- POST /harmonize/preview   - Run harmonization on a JSON row batch, return diff
- POST /harmonize/commit    - Bulk-insert the corrected rows into the database
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..services import harmonization_service
from ..services.import_service import _import_row
from ..dependencies.auth import get_current_user, check_role
from ..models.user import User

router = APIRouter(prefix="/harmonize", tags=["harmonize"])


class HarmonizeRequest(BaseModel):
    rows: List[Dict[str, Any]]


class CommitRequest(BaseModel):
    rows: List[Dict[str, Any]]  # Already-corrected rows to commit


@router.post("/preview")
async def preview_harmonization(
    req: HarmonizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    """
    Run the Data Harmonization Agent on a batch of rows.
    Returns a per-row diff showing original vs corrected values for user review.
    """
    if not req.rows:
        raise HTTPException(status_code=400, detail="No rows provided")
    if len(req.rows) > 500:
        raise HTTPException(status_code=400, detail="Maximum 500 rows per harmonization batch")

    result = await harmonization_service.harmonize_rows(db, req.rows)
    return result


@router.post("/commit")
async def commit_harmonized(
    req: CommitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    """
    Commit the user-approved, harmonized rows to the database.
    """
    if not req.rows:
        raise HTTPException(status_code=400, detail="No rows provided")

    errors = []
    success_count = 0
    for i, row in enumerate(req.rows):
        try:
            await _import_row(db, row, {k: k for k in row.keys()}, {}, current_user.id)
            success_count += 1
        except Exception as e:
            await db.rollback()
            errors.append({"row": i + 1, "error": str(e)})

    return {
        "success_count": success_count,
        "error_count": len(errors),
        "errors": errors
    }
