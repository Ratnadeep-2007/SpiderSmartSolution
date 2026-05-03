import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from ..models.master import RetentionPolicy
from ..models.record import InventoryRecord
from .audit_service import create_audit_log

async def get_policies(db: AsyncSession) -> List[RetentionPolicy]:
    result = await db.execute(select(RetentionPolicy).where(RetentionPolicy.is_active == True))
    return result.scalars().all()

async def create_policy(db: AsyncSession, policy_in: RetentionPolicy) -> RetentionPolicy:
    db_policy = RetentionPolicy(**policy_in.model_dump())
    db.add(db_policy)
    await db.commit()
    await db.refresh(db_policy)
    return db_policy

async def calculate_due_date(reference_date: date, years: int) -> date:
    # Physical records usually expire at the end of the calendar year + years
    return date(reference_date.year + years, 12, 31)

async def apply_legal_hold(db: AsyncSession, record_id: uuid.UUID, user_id: uuid.UUID, reason: str) -> InventoryRecord:
    from .record_service import get_record
    record = await get_record(db, record_id)
    if not record:
        raise ValueError("Record not found")
    
    record.legal_hold = True
    
    await create_audit_log(
        db, 
        action="LEGAL_HOLD_APPLIED", 
        performed_by=user_id, 
        record_id=record_id,
        changes={"reason": reason}
    )
    await db.commit()
    await db.refresh(record)
    return record

async def remove_legal_hold(db: AsyncSession, record_id: uuid.UUID, user_id: uuid.UUID, reason: str) -> InventoryRecord:
    from .record_service import get_record
    record = await get_record(db, record_id)
    if not record:
        raise ValueError("Record not found")
    
    record.legal_hold = False
    
    await create_audit_log(
        db, 
        action="LEGAL_HOLD_REMOVED", 
        performed_by=user_id, 
        record_id=record_id,
        changes={"reason": reason}
    )
    await db.commit()
    await db.refresh(record)
    return record

async def dispose_record(db: AsyncSession, record_id: uuid.UUID, user_id: uuid.UUID) -> InventoryRecord:
    from .record_service import get_record
    record = await get_record(db, record_id)
    if not record:
        raise ValueError("Record not found")
    
    if record.legal_hold:
        raise ValueError("Cannot dispose a record under Legal Hold")
    
    if record.disposition_status != "DUE":
        raise ValueError("Record is not marked as DUE for disposition")

    record.disposition_status = "DISPOSED"
    record.is_active = False
    
    await create_audit_log(
        db, 
        action="DISPOSE", 
        performed_by=user_id, 
        record_id=record_id,
        changes={"status_change": "DISPOSED"}
    )
    await db.commit()
    await db.refresh(record)
    return record

async def sweep_retention_dates(db: AsyncSession) -> int:
    """
    Background worker logic: Mark records as DUE if their date has passed.
    """
    today = date.today()
    query = (
        update(InventoryRecord)
        .where(
            InventoryRecord.disposition_status == "ACTIVE",
            InventoryRecord.legal_hold == False,
            InventoryRecord.retention_due_date <= today
        )
        .values(disposition_status="DUE")
    )
    result = await db.execute(query)
    await db.commit()
    return result.rowcount
