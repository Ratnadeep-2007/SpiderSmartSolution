import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import retention as schemas
from ..schemas.record import RecordInDB
from ..services import retention_service
from ..dependencies.auth import get_current_user, check_role
from ..models.user import User

router = APIRouter(prefix="/retention", tags=["retention"])

@router.get("/policies", response_model=List[schemas.RetentionPolicy])
async def list_policies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await retention_service.get_policies(db)

@router.post("/policies", response_model=schemas.RetentionPolicy, status_code=status.HTTP_201_CREATED)
async def create_policy(
    policy_in: schemas.RetentionPolicyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    return await retention_service.create_policy(db, policy_in)

@router.post("/records/{record_id}/legal-hold", response_model=RecordInDB)
async def apply_hold(
    record_id: uuid.UUID,
    action: schemas.LegalHoldAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    try:
        return await retention_service.apply_legal_hold(db, record_id, current_user.id, action.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/records/{record_id}/legal-hold", response_model=RecordInDB)
async def remove_hold(
    record_id: uuid.UUID,
    action: schemas.LegalHoldAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    try:
        return await retention_service.remove_legal_hold(db, record_id, current_user.id, action.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/records/{record_id}/dispose", response_model=RecordInDB)
async def perform_disposal(
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    try:
        return await retention_service.dispose_record(db, record_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sweep", status_code=status.HTTP_200_OK)
async def manual_sweep(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    """Manual trigger for the retention sweep (usually run by scheduler)"""
    count = await retention_service.sweep_retention_dates(db)
    return {"status": "success", "records_updated": count}

