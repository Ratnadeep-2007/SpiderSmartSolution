import uuid
import json
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, or_
from sqlalchemy.orm import selectinload
from ..models.record import InventoryRecord, RecordVersion
from ..models.master import RecordType, RecordTypeField, Entity, Department, EntityType
from ..schemas.record import RecordCreate, RecordUpdate
from .audit_service import create_audit_log
from .retention_service import calculate_due_date
from .classification_service import evaluate_rules_for_record

from ..models.user import User

async def get_records(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 100, 
    current_user: Optional[User] = None
) -> List[InventoryRecord]:
    query = select(InventoryRecord).options(selectinload(InventoryRecord.record_type), selectinload(InventoryRecord.category))
    
    # Apply Scoping for Guests
    if current_user and current_user.role == "EXTERNAL_GUEST" and current_user.scoped_filters:
        filters = current_user.scoped_filters
        if "entity_id" in filters:
            query = query.where(InventoryRecord.entity_id == uuid.UUID(filters["entity_id"]))
        if "department_id" in filters:
            query = query.where(InventoryRecord.department_id == uuid.UUID(filters["department_id"]))
        if "entity_type_id" in filters:
            query = query.where(InventoryRecord.entity_type_id == uuid.UUID(filters["entity_type_id"]))

    result = await db.execute(
        query.offset(skip).limit(limit)
    )
    return result.scalars().all()

async def get_record(db: AsyncSession, record_id: uuid.UUID, current_user: Optional[User] = None) -> Optional[InventoryRecord]:
    query = select(InventoryRecord).options(selectinload(InventoryRecord.record_type), selectinload(InventoryRecord.category)).where(InventoryRecord.id == record_id)
    
    # Apply Scoping for Guests
    if current_user and current_user.role == "EXTERNAL_GUEST" and current_user.scoped_filters:
        filters = current_user.scoped_filters
        if "entity_id" in filters:
            query = query.where(InventoryRecord.entity_id == uuid.UUID(filters["entity_id"]))
        if "department_id" in filters:
            query = query.where(InventoryRecord.department_id == uuid.UUID(filters["department_id"]))
        if "entity_type_id" in filters:
            query = query.where(InventoryRecord.entity_type_id == uuid.UUID(filters["entity_type_id"]))

    result = await db.execute(query)
    record = result.scalar_one_or_none()
    
    # Optional: Log READ action for high-security audit
    if record and current_user:
        await create_audit_log(
            db, 
            action="READ", 
            performed_by=current_user.id, 
            record_id=record_id,
            changes={"viewed_at": datetime.now().isoformat()}
        )
        await db.commit()
        
    return record

async def get_record_by_barcode(db: AsyncSession, barcode: str) -> Optional[InventoryRecord]:
    result = await db.execute(
        select(InventoryRecord)
        .options(selectinload(InventoryRecord.record_type), selectinload(InventoryRecord.category))
        .where(or_(InventoryRecord.box_barcode == barcode, InventoryRecord.file_barcode == barcode))
    )
    return result.scalar_one_or_none()

async def create_record(db: AsyncSession, record_in: RecordCreate, user_id: uuid.UUID) -> InventoryRecord:
    # 1. Validate against RecordType if provided
    if record_in.record_type_id:
        rt_result = await db.execute(
            select(RecordType).options(selectinload(RecordType.fields)).where(RecordType.id == record_in.record_type_id)
        )
        record_type = rt_result.scalar_one_or_none()
        if not record_type:
            raise ValueError("Invalid record_type_id")
        
        custom_data = record_in.custom_fields or {}
        for field in record_type.fields:
            if field.is_required and field.name not in custom_data:
                raise ValueError(f"Custom field '{field.label}' is required for this record type")

    # 2. Resolve IDs to strings for caching/search
    entity = await db.get(Entity, record_in.entity_id)
    department = await db.get(Department, record_in.department_id)
    entity_type = await db.get(EntityType, record_in.entity_type_id)
    
    if not entity:
        raise ValueError("Invalid entity_id")
    if not department:
        raise ValueError("Invalid department_id")
    if not entity_type:
        raise ValueError("Invalid entity_type_id")

    # 3. Calculate Retention Due Date if not provided
    ret_due = record_in.retention_due_date
    if not ret_due:
        ret_due = await calculate_due_date(record_in.record_date, 7)

    # 4. Create the record
    record_data = record_in.model_dump(exclude={"retention_due_date"})
    record_data["entity"] = entity.name
    record_data["entity_code"] = entity.entity_code
    record_data["department"] = department.name
    record_data["entity_type"] = entity_type.name

    db_record = InventoryRecord(
        **record_data,
        retention_due_date=ret_due,
        created_by=user_id,
        updated_by=user_id,
        version=1
    )
    db.add(db_record)
    await db.flush() # Ensure version and core fields are in DB
    
    # 5. Trigger Auto-classification synchronously
    await evaluate_rules_for_record(db, db_record.id)
    await db.refresh(db_record)

    # 5.1 Generate and assign vector embedding for semantic search
    try:
        from .embedding_service import get_embedding, get_record_text_representation
        text_rep = get_record_text_representation(db_record)
        embedding = await get_embedding(text_rep)
        if embedding:
            db_record.embedding = embedding
    except Exception as emb_err:
        import logging
        logging.getLogger("app.services.record_service").error(f"Failed to generate embedding during create: {str(emb_err)}")

    # 5. Create the initial version snapshot
    snapshot = {
        column.name: getattr(db_record, column.name)
        for column in db_record.__table__.columns
    }
    snapshot_json = json.loads(json.dumps(snapshot, default=str))
    
    version_entry = RecordVersion(
        record_id=db_record.id,
        version=1,
        data_snapshot=snapshot_json,
        created_by=user_id
    )
    db.add(version_entry)

    # 6. Audit log
    await create_audit_log(
        db, 
        action="CREATE", 
        performed_by=user_id, 
        record_id=db_record.id,
        changes=snapshot_json
    )
    
    await db.commit()
    return await get_record(db, db_record.id)

async def update_record(
    db: AsyncSession, 
    record_id: uuid.UUID, 
    record_in: RecordUpdate, 
    user_id: uuid.UUID,
    if_match: Optional[datetime] = None
) -> Optional[InventoryRecord]:
    db_record = await get_record(db, record_id)
    if not db_record:
        return None
    
    # Optimistic Locking check
    if if_match and db_record.updated_at:
        # Round to nearest second/millisecond as DB might lose precision
        if db_record.updated_at.replace(microsecond=0) != if_match.replace(microsecond=0):
            raise ValueError("CONFLICT: Record was modified by another user. Please refresh.")

    update_data = record_in.model_dump(exclude_unset=True)

    # 1. Validate against RecordType if it changed or if custom_fields are updated
    final_record_type_id = update_data.get("record_type_id", db_record.record_type_id)
    final_custom_fields = update_data.get("custom_fields", db_record.custom_fields or {})
    
    if "record_type_id" in update_data or "custom_fields" in update_data:
        if final_record_type_id:
            rt_result = await db.execute(
                select(RecordType).options(selectinload(RecordType.fields)).where(RecordType.id == final_record_type_id)
            )
            record_type = rt_result.scalar_one_or_none()
            if not record_type:
                raise ValueError("Invalid record_type_id")
            
            for field in record_type.fields:
                if field.is_required and field.name not in final_custom_fields:
                    raise ValueError(f"Custom field '{field.label}' is required for this record type")
    
    # Resolve new IDs if they were changed
    if "entity_id" in update_data:
        entity = await db.get(Entity, update_data["entity_id"])
        if entity:
            update_data["entity"] = entity.name
            update_data["entity_code"] = entity.entity_code
    if "department_id" in update_data:
        department = await db.get(Department, update_data["department_id"])
        if department:
            update_data["department"] = department.name
    if "entity_type_id" in update_data:
        entity_type = await db.get(EntityType, update_data["entity_type_id"])
        if entity_type:
            update_data["entity_type"] = entity_type.name

    # Audit log changes (ensure serializable)
    before_data = {k: getattr(db_record, k) for k in update_data.keys() if hasattr(db_record, k)}
    changes = {
        "before": json.loads(json.dumps(before_data, default=str)),
        "after": record_in.model_dump(exclude_unset=True, mode='json')
    }
    
    # Apply updates
    for field, value in update_data.items():
        setattr(db_record, field, value)
    
    # Increment version
    db_record.version = (db_record.version or 1) + 1
    db_record.updated_by = user_id
    
    # 1. Flush core changes to DB
    await db.flush()
    
    # 2. Trigger Auto-classification (flushes its own SQL updates)
    await evaluate_rules_for_record(db, db_record.id)
    
    # 3. Refresh object to get classification results (tags, category_id)
    await db.refresh(db_record)

    # 3.1 Update vector embedding for semantic search
    try:
        from .embedding_service import get_embedding, get_record_text_representation
        text_rep = get_record_text_representation(db_record)
        embedding = await get_embedding(text_rep)
        if embedding:
            db_record.embedding = embedding
    except Exception as emb_err:
        import logging
        logging.getLogger("app.services.record_service").error(f"Failed to generate embedding during update: {str(emb_err)}")

    # 4. Create new version snapshot from fully updated object
    snapshot = {
        column.name: getattr(db_record, column.name)
        for column in db_record.__table__.columns
    }
    snapshot_json = json.loads(json.dumps(snapshot, default=str))
    
    version_entry = RecordVersion(
        record_id=record_id,
        version=db_record.version,
        data_snapshot=snapshot_json,
        created_by=user_id
    )
    db.add(version_entry)
    
    await create_audit_log(
        db, 
        action="UPDATE", 
        performed_by=user_id, 
        record_id=record_id,
        changes=changes
    )
    
    await db.commit()
    await db.refresh(db_record) # Final refresh to ensure all relations are clean
    return db_record

async def get_record_versions(db: AsyncSession, record_id: uuid.UUID) -> List[RecordVersion]:
    result = await db.execute(
        select(RecordVersion)
        .where(RecordVersion.record_id == record_id)
        .order_by(RecordVersion.version.desc())
    )
    return result.scalars().all()

async def revert_to_version(db: AsyncSession, record_id: uuid.UUID, version_num: int, user_id: uuid.UUID) -> Optional[InventoryRecord]:
    # 1. Fetch the target version
    v_result = await db.execute(
        select(RecordVersion).where(
            RecordVersion.record_id == record_id, 
            RecordVersion.version == version_num
        )
    )
    target_version = v_result.scalar_one_or_none()
    if not target_version:
        return None
    
    # 2. Fetch the current record
    db_record = await get_record(db, record_id)
    if not db_record:
        return None
    
    # 3. Apply the snapshot data back to the record
    snapshot = target_version.data_snapshot
    # Skip system fields that shouldn't be reverted or should be handled carefully
    skip_fields = {'id', 'version', 'created_at', 'updated_at', 'search_vector'}
    
    for field, value in snapshot.items():
        if field in skip_fields:
            continue
        if hasattr(db_record, field):
            setattr(db_record, field, value)
            
    db_record.version += 1
    db_record.updated_by = user_id
    
    # Recalculate vector embedding after reverting
    try:
        from .embedding_service import get_embedding, get_record_text_representation
        text_rep = get_record_text_representation(db_record)
        embedding = await get_embedding(text_rep)
        if embedding:
            db_record.embedding = embedding
    except Exception as emb_err:
        import logging
        logging.getLogger("app.services.record_service").error(f"Failed to generate embedding during revert: {str(emb_err)}")
    
    # 4. Create a new version entry for this revert action
    full_data = {
        column.name: getattr(db_record, column.name)
        for column in db_record.__table__.columns
    }
    full_snapshot = json.loads(json.dumps(full_data, default=str))
    
    new_version_entry = RecordVersion(
        record_id=record_id,
        version=db_record.version,
        data_snapshot=full_snapshot,
        created_by=user_id
    )
    db.add(new_version_entry)
    
    # 5. Audit log
    await create_audit_log(
        db, 
        action="REVERT", 
        performed_by=user_id, 
        record_id=record_id,
        changes={"reverted_to_version": version_num, "new_version": db_record.version}
    )
    
    await db.commit()
    return await get_record(db, db_record.id)

async def delete_record(db: AsyncSession, record_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    db_record = await get_record(db, record_id)
    if not db_record:
        return False
    
    # Audit before delete
    snapshot = {
        column.name: getattr(db_record, column.name)
        for column in db_record.__table__.columns
    }
    snapshot_json = json.loads(json.dumps(snapshot, default=str))
    
    await create_audit_log(
        db, 
        action="DELETE", 
        performed_by=user_id, 
        record_id=record_id,
        changes=snapshot_json
    )
    
    # Free up any warehouse bin mapping
    from ..models.warehouse import WarehouseBin
    await db.execute(
        update(WarehouseBin)
        .where(WarehouseBin.record_id == record_id)
        .values(record_id=None, is_occupied=False)
    )
    
    await db.delete(db_record)
    await db.commit()
    return True
