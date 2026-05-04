import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from ..models.audit_log import AuditLog
from ..models.user import User

async def create_audit_log(
    db: AsyncSession,
    action: str,
    performed_by: uuid.UUID,
    record_id: Optional[uuid.UUID] = None,
    changes: Optional[dict] = None,
    ip_address: Optional[str] = None
):
    # Fetch the previous hash for chaining
    result = await db.execute(select(AuditLog.tamper_hash).order_by(desc(AuditLog.performed_at)).limit(1))
    previous_hash = result.scalar_one_or_none()

    # Use a fixed timestamp for both hash and database entry
    performed_at = datetime.now(timezone.utc)

    # Create the data string for hashing (integrity check)
    # Chaining: include previous_hash
    # Comprehensive: include timestamp and IP
    log_data = (
        f"{previous_hash}"
        f"{record_id}"
        f"{action}"
        f"{performed_by}"
        f"{performed_at.isoformat()}"
        f"{ip_address}"
        f"{json.dumps(changes, sort_keys=True)}"
    )
    tamper_hash = hashlib.sha256(log_data.encode()).hexdigest()

    db_log = AuditLog(
        record_id=record_id,
        action=action,
        performed_by=performed_by,
        performed_at=performed_at,
        ip_address=ip_address,
        changes=changes,
        previous_hash=previous_hash,
        tamper_hash=tamper_hash
    )
    db.add(db_log)
    return db_log

async def get_audit_logs(
    db: AsyncSession,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    record_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = 1,
    size: int = 50
) -> dict:
    query = select(
        AuditLog, 
        User.email.label("user_email"),
        User.user_id.label("app_user_id")
    ).join(User, AuditLog.performed_by == User.id, isouter=True)
    
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        # Filter by the custom user_id string
        query = query.where(User.user_id.ilike(f"%{user_id}%"))
    if record_id:
        query = query.where(AuditLog.record_id == record_id)
    if start_date:
        query = query.where(AuditLog.performed_at >= start_date)
    if end_date:
        query = query.where(AuditLog.performed_at <= end_date)
        
    query = query.order_by(AuditLog.performed_at.desc())
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    # Pagination
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    rows = result.all()
    
    logs = []
    for row in rows:
        log_dict = {column.name: getattr(row.AuditLog, column.name) for column in AuditLog.__table__.columns}
        log_dict["user_email"] = row.user_email
        log_dict["app_user_id"] = row.app_user_id
        logs.append(log_dict)
        
    return {
        "data": logs,
        "total": total,
        "page": page,
        "size": size
    }

async def verify_audit_chain(db: AsyncSession) -> dict:
    # Use a stream to avoid loading all logs into memory at once
    # Ordering by performed_at is critical for verifying the cryptographic chain
    result = await db.stream(select(AuditLog).order_by(AuditLog.performed_at.asc()))
    
    invalid_log_ids = []
    total_checked = 0
    expected_previous_hash = None
    
    async for log in result.scalars():
        total_checked += 1
        
        # 1. Try New Robust Chaining Logic
        # We use ISO format for the timestamp to ensure string consistency
        log_data_new = (
            f"{log.previous_hash}"
            f"{log.record_id}"
            f"{log.action}"
            f"{log.performed_by}"
            f"{log.performed_at.isoformat()}"
            f"{log.ip_address}"
            f"{json.dumps(log.changes, sort_keys=True)}"
        )
        computed_hash_new = hashlib.sha256(log_data_new.encode()).hexdigest()
        
        is_valid = False
        if computed_hash_new == log.tamper_hash:
            # For new logic, we must also verify the chain link
            # The only exception is the very first "genesis" log of a new chain
            # which will have previous_hash as None but match the new hash format.
            if total_checked > 1 and log.previous_hash != expected_previous_hash:
                is_valid = False
            else:
                is_valid = True
        
        # 2. Fallback to Legacy Logic (for logs created before the upgrade)
        # Legacy logs never have a previous_hash.
        if not is_valid and log.previous_hash is None:
            log_data_legacy = f"{log.record_id}{log.action}{log.performed_by}{json.dumps(log.changes, sort_keys=True)}"
            computed_hash_legacy = hashlib.sha256(log_data_legacy.encode()).hexdigest()
            if computed_hash_legacy == log.tamper_hash:
                is_valid = True
        
        if not is_valid:
            invalid_log_ids.append(log.id)
            
        # Update expected_previous_hash for the next record in the chain
        expected_previous_hash = log.tamper_hash
            
    return {
        "is_valid": len(invalid_log_ids) == 0,
        "total_checked": total_checked,
        "invalid_log_ids": invalid_log_ids
    }
