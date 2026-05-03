import hashlib
import json
import uuid
from datetime import datetime
from typing import Optional, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
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
    # Create the data string for hashing (integrity check)
    log_data = f"{record_id}{action}{performed_by}{json.dumps(changes, sort_keys=True)}"
    tamper_hash = hashlib.sha256(log_data.encode()).hexdigest()

    db_log = AuditLog(
        record_id=record_id,
        action=action,
        performed_by=performed_by,
        changes=changes,
        ip_address=ip_address,
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
    # Fetch all logs for integrity check
    result = await db.execute(select(AuditLog).order_by(AuditLog.performed_at.asc()))
    logs = result.scalars().all()
    
    invalid_log_ids = []
    
    for log in logs:
        # Re-compute hash using same logic as create_audit_log
        log_data = f"{log.record_id}{log.action}{log.performed_by}{json.dumps(log.changes, sort_keys=True)}"
        computed_hash = hashlib.sha256(log_data.encode()).hexdigest()
        
        if computed_hash != log.tamper_hash:
            invalid_log_ids.append(log.id)
            
    return {
        "is_valid": len(invalid_log_ids) == 0,
        "total_checked": len(logs),
        "invalid_log_ids": invalid_log_ids
    }
