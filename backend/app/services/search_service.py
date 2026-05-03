import uuid
from datetime import date
from typing import List, Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from ..models.record import InventoryRecord, SavedSearch
from ..models.user import User

async def search_records(
    db: AsyncSession,
    q: Optional[str] = None,
    entity: Optional[str] = None,
    entity_id: Optional[uuid.UUID] = None,
    department: Optional[str] = None,
    department_id: Optional[uuid.UUID] = None,
    entity_type_id: Optional[uuid.UUID] = None,
    location: Optional[str] = None,
    record_date: Optional[date] = None,
    record_type_id: Optional[uuid.UUID] = None,
    category_id: Optional[uuid.UUID] = None,
    disposition_status: Optional[str] = None,
    tags: Optional[List[str]] = None,
    page: int = 1,
    size: int = 50,
    current_user: Optional[User] = None
) -> Dict[str, Any]:
    query = select(InventoryRecord).options(selectinload(InventoryRecord.record_type))
    
    # 0. Apply Security Scoping (For External Guests)
    if current_user and current_user.role == "EXTERNAL_GUEST" and current_user.scoped_filters:
        filters = current_user.scoped_filters
        if "entity_id" in filters:
            query = query.where(InventoryRecord.entity_id == uuid.UUID(filters["entity_id"]))
        if "department_id" in filters:
            query = query.where(InventoryRecord.department_id == uuid.UUID(filters["department_id"]))
        if "entity_type_id" in filters:
            query = query.where(InventoryRecord.entity_type_id == uuid.UUID(filters["entity_type_id"]))

    # 1. Full-Text Search
    if q and q.strip():
        query = query.where(InventoryRecord.search_vector.op('@@')(func.plainto_tsquery('english', q)))
        query = query.order_by(func.ts_rank(InventoryRecord.search_vector, func.plainto_tsquery('english', q)).desc())
    else:
        query = query.order_by(InventoryRecord.created_at.desc())

    # 2. Faceted Filters
    if entity_id:
        query = query.where(InventoryRecord.entity_id == entity_id)
    elif entity:
        query = query.where(InventoryRecord.entity == entity)
        
    if department_id:
        query = query.where(InventoryRecord.department_id == department_id)
    elif department:
        query = query.where(InventoryRecord.department.ilike(f"%{department}%"))

    if entity_type_id:
        query = query.where(InventoryRecord.entity_type_id == entity_type_id)

    if location:
        query = query.where(InventoryRecord.location.ilike(f"%{location}%"))
    if record_date:
        if isinstance(record_date, str):
            try:
                record_date = date.fromisoformat(record_date)
            except ValueError:
                pass
        query = query.where(InventoryRecord.record_date == record_date)
    if record_type_id:
        query = query.where(InventoryRecord.record_type_id == record_type_id)
    if category_id:
        query = query.where(InventoryRecord.category_id == category_id)
    if disposition_status:
        query = query.where(InventoryRecord.disposition_status == disposition_status)
    if tags:
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(',') if t.strip()]
        for tag in tags:
            query = query.where(InventoryRecord.tags.any(tag))

    # 3. Count total results
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # 4. Pagination
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    records = result.scalars().all()

    return {
        "data": records,
        "total": total,
        "page": page,
        "size": size
    }

async def get_saved_searches(db: AsyncSession, user_id: uuid.UUID) -> List[SavedSearch]:
    result = await db.execute(select(SavedSearch).where(SavedSearch.user_id == user_id))
    return result.scalars().all()

async def create_saved_search(db: AsyncSession, user_id: uuid.UUID, name: str, query_params: dict) -> SavedSearch:
    db_saved = SavedSearch(
        user_id=user_id,
        name=name,
        query_params=query_params
    )
    db.add(db_saved)
    await db.commit()
    await db.refresh(db_saved)
    return db_saved

async def delete_saved_search(db: AsyncSession, search_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(SavedSearch).where(and_(SavedSearch.id == search_id, SavedSearch.user_id == user_id))
    )
    db_saved = result.scalar_one_or_none()
    if not db_saved:
        return False
    await db.delete(db_saved)
    await db.commit()
    return True
