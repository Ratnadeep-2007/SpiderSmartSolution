"""
Digital Compliance Officer (DCO) Agent Router.

Endpoints:
- POST /dco/sweep          - Manually trigger DCO agent sweep (admin only)
- GET  /dco/approve        - Manager approval callback for disposal manifest
- GET  /dco/manifests      - List pending disposal manifests from last sweep
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..services import dco_service
from ..dependencies.auth import get_current_user, check_role
from ..models.user import User

router = APIRouter(prefix="/dco", tags=["dco"])


@router.post("/sweep")
async def trigger_dco_sweep(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    """Manually trigger the DCO agent sweep."""
    result = await dco_service.run_dco_agent(db)
    return result


@router.get("/approve")
async def approve_disposal(
    token: str = Query(..., description="Signed disposal approval token"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manager approval endpoint. Validates the signed JWT token
    and executes bulk disposal of the manifest records.
    """
    try:
        result = await dco_service.execute_bulk_disposal(db, token, current_user.id)
        return {
            "status": "success",
            "message": f"Successfully disposed {result['disposed_count']} records from department '{result['department']}'.",
            **result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
