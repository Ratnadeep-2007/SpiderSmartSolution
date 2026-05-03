import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models.report import ScheduledExport
from ..schemas import schedule as schemas
from ..dependencies.auth import get_current_user, check_role
from ..models.user import User

router = APIRouter(prefix="/schedules", tags=["schedules"])

@router.get("", response_model=List[schemas.ScheduledExport])
async def list_schedules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Admins and Records Managers can see all schedules, others only their own
    if current_user.role in ["SYSTEM_ADMIN", "RECORDS_MANAGER"]:
        result = await db.execute(select(ScheduledExport))
    else:
        result = await db.execute(select(ScheduledExport).where(ScheduledExport.user_id == current_user.id))
    return result.scalars().all()

@router.post("", response_model=schemas.ScheduledExport)
async def create_schedule(
    sch_in: schemas.ScheduledExportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    db_sch = ScheduledExport(**sch_in.model_dump(), user_id=current_user.id)
    db.add(db_sch)
    await db.commit()
    await db.refresh(db_sch)
    return db_sch

@router.delete("/{sch_id}")
async def delete_schedule(
    sch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    result = await db.execute(select(ScheduledExport).where(ScheduledExport.id == sch_id))
    db_sch = result.scalar_one_or_none()
    if not db_sch:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    await db.delete(db_sch)
    await db.commit()
    return {"status": "success"}

