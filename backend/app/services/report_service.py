import uuid
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from ..models.record import InventoryRecord
from ..models.audit_log import AuditLog
from ..models.user import User

async def get_records_by_entity(db: AsyncSession) -> List[Dict[str, Any]]:
    result = await db.execute(
        select(InventoryRecord.entity, func.count(InventoryRecord.id).label("count"))
        .group_by(InventoryRecord.entity)
        .order_by(func.count(InventoryRecord.id).desc())
    )
    return [{"name": row.entity, "value": row.count} for row in result]

async def get_records_by_department(db: AsyncSession) -> List[Dict[str, Any]]:
    result = await db.execute(
        select(InventoryRecord.department, func.count(InventoryRecord.id).label("count"))
        .group_by(InventoryRecord.department)
        .order_by(func.count(InventoryRecord.id).desc())
    )
    return [{"name": row.department, "value": row.count} for row in result]

async def get_records_by_year(db: AsyncSession) -> List[Dict[str, Any]]:
    result = await db.execute(
        select(func.extract('year', InventoryRecord.record_date).label("year"), func.count(InventoryRecord.id).label("count"))
        .group_by(func.extract('year', InventoryRecord.record_date))
        .order_by(func.extract('year', InventoryRecord.record_date).desc())
    )
    return [{"name": str(int(row.year)), "value": row.count} for row in result]

async def get_records_by_location(db: AsyncSession) -> List[Dict[str, Any]]:
    result = await db.execute(
        select(InventoryRecord.location, func.count(InventoryRecord.id).label("count"))
        .group_by(InventoryRecord.location)
        .order_by(func.count(InventoryRecord.id).desc())
    )
    return [{"name": row.location, "value": row.count} for row in result]

async def get_retention_compliance(db: AsyncSession) -> List[Dict[str, Any]]:
    result = await db.execute(
        select(InventoryRecord.disposition_status, func.count(InventoryRecord.id).label("count"))
        .group_by(InventoryRecord.disposition_status)
    )
    return [{"name": row.disposition_status, "value": row.count} for row in result]

async def get_upcoming_dispositions(db: AsyncSession, days: int = 30) -> List[Dict[str, Any]]:
    today = datetime.now().date()
    target_date = today + timedelta(days=days)
    
    result = await db.execute(
        select(InventoryRecord)
        .where(and_(
            InventoryRecord.retention_due_date >= today,
            InventoryRecord.retention_due_date <= target_date,
            InventoryRecord.disposition_status != "DISPOSED"
        ))
        .order_by(InventoryRecord.retention_due_date.asc())
    )
    records = result.scalars().all()
    return [{
        "id": str(r.id),
        "box_barcode": r.box_barcode,
        "file_barcode": r.file_barcode,
        "due_date": r.retention_due_date.isoformat() if r.retention_due_date else None,
        "entity": r.entity
    } for r in records]

async def get_activity_by_user(db: AsyncSession) -> List[Dict[str, Any]]:
    result = await db.execute(
        select(User.email, func.count(AuditLog.id).label("count"))
        .join(AuditLog, AuditLog.performed_by == User.id)
        .group_by(User.email)
        .order_by(func.count(AuditLog.id).desc())
    )
    return [{"name": row.email, "value": row.count} for row in result]

async def get_active_legal_holds(db: AsyncSession) -> List[Dict[str, Any]]:
    result = await db.execute(
        select(InventoryRecord)
        .where(InventoryRecord.legal_hold == True)
    )
    records = result.scalars().all()
    return [{
        "id": str(r.id),
        "box_barcode": r.box_barcode,
        "file_barcode": r.file_barcode,
        "entity": r.entity
    } for r in records]

async def get_dashboard_stats(db: AsyncSession) -> Dict[str, Any]:
    # Total Records
    total_res = await db.execute(select(func.count(InventoryRecord.id)))
    total_records = total_res.scalar()
    
    # Active Legal Holds
    holds_res = await db.execute(select(func.count(InventoryRecord.id)).where(InventoryRecord.legal_hold == True))
    active_holds = holds_res.scalar()
    
    # Records due for disposition
    due_res = await db.execute(select(func.count(InventoryRecord.id)).where(InventoryRecord.disposition_status == "DUE"))
    due_count = due_res.scalar()
    
    # Recently created (last 7 days)
    seven_days_ago = datetime.now() - timedelta(days=7)
    recent_res = await db.execute(select(func.count(InventoryRecord.id)).where(InventoryRecord.created_at >= seven_days_ago))
    recent_count = recent_res.scalar()
    
    return {
        "total_records": total_records,
        "active_holds": active_holds,
        "due_for_disposition": due_count,
        "recent_activity": recent_count
    }

async def get_custom_report(
    db: AsyncSession, 
    columns: List[str], 
    start_date: Optional[date] = None, 
    end_date: Optional[date] = None
) -> List[Dict[str, Any]]:
    # Map friendly names to actual columns
    column_map = {
        "box_barcode": InventoryRecord.box_barcode,
        "file_barcode": InventoryRecord.file_barcode,
        "entity": InventoryRecord.entity,
        "department": InventoryRecord.department,
        "location": InventoryRecord.location,
        "year": InventoryRecord.record_date,
        "disposition_status": InventoryRecord.disposition_status,
        "retention_due_date": InventoryRecord.retention_due_date,
        "created_at": InventoryRecord.created_at,
        "description": InventoryRecord.description
    }
    
    selected_cols = []
    for col in columns:
        if col in column_map:
            selected_cols.append(column_map[col])
        
    if not selected_cols:
        return []
        
    query = select(*selected_cols)
    
    if start_date:
        query = query.where(InventoryRecord.record_date >= start_date)
    if end_date:
        query = query.where(InventoryRecord.record_date <= end_date)
        
    query = query.order_by(InventoryRecord.created_at.desc())
    
    result = await db.execute(query)
    rows = result.all()
    
    return [dict(zip(columns, row)) for row in rows]
