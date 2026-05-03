import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models.master import RecordType, RecordTypeField, EntityType, Entity, Department, Location, Category, AutoClassificationRule
from ..models.user import User
from ..schemas import master as schemas
from ..dependencies.auth import get_current_user, check_role

router = APIRouter(prefix="/master", tags=["master"])

# --- Entity Types ---

@router.get("/entity-types", response_model=List[schemas.EntityType])
async def get_entity_types(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(EntityType))
    return result.scalars().all()

@router.post("/entity-types", response_model=schemas.EntityType)
async def create_entity_type(
    et_in: schemas.EntityTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    db_et = EntityType(**et_in.model_dump())
    db.add(db_et)
    await db.commit()
    await db.refresh(db_et)
    return db_et

@router.put("/entity-types/{et_id}", response_model=schemas.EntityType)
async def update_entity_type(
    et_id: uuid.UUID,
    et_in: schemas.EntityTypeBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    result = await db.execute(select(EntityType).where(EntityType.id == et_id))
    db_et = result.scalar_one_or_none()
    if not db_et:
        raise HTTPException(status_code=404, detail="Entity Type not found")
    
    for key, value in et_in.model_dump().items():
        setattr(db_et, key, value)
    
    await db.commit()
    await db.refresh(db_et)
    return db_et

@router.delete("/entity-types/{et_id}")
async def delete_entity_type(
    et_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    result = await db.execute(select(EntityType).where(EntityType.id == et_id))
    db_et = result.scalar_one_or_none()
    if not db_et:
        raise HTTPException(status_code=404, detail="Entity Type not found")
    
    await db.delete(db_et)
    await db.commit()
    return {"status": "success"}

# --- Entities ---

@router.get("/entities", response_model=List[schemas.Entity])
async def get_entities(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Entity).where(Entity.is_active == True))
    return result.scalars().all()

@router.post("/entities", response_model=schemas.Entity)
async def create_entity(
    entity_in: schemas.EntityBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    db_entity = Entity(**entity_in.model_dump())
    db.add(db_entity)
    await db.commit()
    await db.refresh(db_entity)
    return db_entity

@router.put("/entities/{entity_id}", response_model=schemas.Entity)
async def update_entity(
    entity_id: uuid.UUID,
    entity_in: schemas.EntityBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    result = await db.execute(select(Entity).where(Entity.id == entity_id))
    db_entity = result.scalar_one_or_none()
    if not db_entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    for key, value in entity_in.model_dump().items():
        setattr(db_entity, key, value)
    
    await db.commit()
    await db.refresh(db_entity)
    return db_entity

@router.delete("/entities/{entity_id}")
async def delete_entity(
    entity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    result = await db.execute(select(Entity).where(Entity.id == entity_id))
    db_entity = result.scalar_one_or_none()
    if not db_entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Check for dependent departments
    dept_check = await db.execute(select(Department).where(Department.entity_id == entity_id))
    if dept_check.scalars().first():
         raise HTTPException(status_code=400, detail="Cannot delete entity with active departments. Delete departments first.")

    await db.delete(db_entity)
    await db.commit()
    return {"status": "success"}

# --- Departments ---

@router.get("/departments", response_model=List[schemas.Department])
async def get_departments(
    entity_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Department).where(Department.is_active == True)
    if entity_id:
        query = query.where(Department.entity_id == entity_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/departments", response_model=schemas.Department)
async def create_department(
    dept_in: schemas.DepartmentBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    db_dept = Department(**dept_in.model_dump())
    db.add(db_dept)
    await db.commit()
    await db.refresh(db_dept)
    return db_dept

@router.put("/departments/{dept_id}", response_model=schemas.Department)
async def update_department(
    dept_id: uuid.UUID,
    dept_in: schemas.DepartmentBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    result = await db.execute(select(Department).where(Department.id == dept_id))
    db_dept = result.scalar_one_or_none()
    if not db_dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    for key, value in dept_in.model_dump().items():
        setattr(db_dept, key, value)
    
    await db.commit()
    await db.refresh(db_dept)
    return db_dept

@router.delete("/departments/{dept_id}")
async def delete_department(
    dept_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    result = await db.execute(select(Department).where(Department.id == dept_id))
    db_dept = result.scalar_one_or_none()
    if not db_dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    await db.delete(db_dept)
    await db.commit()
    return {"status": "success"}

@router.get("/locations", response_model=List[schemas.Location])
async def get_locations(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Location).where(Location.is_active == True))
    return result.scalars().all()

@router.get("/categories", response_model=List[schemas.Category])
async def get_categories(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Fetch all categories to build the tree manually and avoid lazy-loading issues
    result = await db.execute(select(Category))
    all_cats = result.scalars().all()
    
    # Create dictionary representations to avoid touching model relationships during serialization
    cat_dicts = [
        {
            "id": c.id,
            "name": c.name,
            "parent_id": c.parent_id,
            "path": c.path,
            "children": []
        }
        for c in all_cats
    ]
    
    cat_map = {c["id"]: c for c in cat_dicts}
    roots = []
    for c in cat_dicts:
        if c["parent_id"] is None:
            roots.append(c)
        else:
            parent = cat_map.get(c["parent_id"])
            if parent:
                parent["children"].append(c)
    
    return roots

@router.get("/users", response_model=List[dict])
async def get_master_users(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(User).where(User.is_active == True))
    users = result.scalars().all()
    return [{"id": u.id, "email": u.email, "user_id": u.user_id} for u in users]

@router.get("/classification-rules", response_model=List[schemas.AutoClassificationRule])
async def get_classification_rules(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(AutoClassificationRule).order_by(AutoClassificationRule.priority.desc()))
    return result.scalars().all()

@router.post("/categories", response_model=schemas.Category)
async def create_category(
    cat_in: schemas.CategoryBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    db_cat = Category(**cat_in.model_dump())
    db.add(db_cat)
    await db.commit()
    await db.refresh(db_cat)
    
    # Return as dict to avoid lazy-loading issues during serialization
    return {
        "id": db_cat.id,
        "name": db_cat.name,
        "parent_id": db_cat.parent_id,
        "path": db_cat.path,
        "children": []
    }

@router.put("/categories/{cat_id}", response_model=schemas.Category)
async def update_category(
    cat_id: uuid.UUID,
    cat_in: schemas.CategoryBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    result = await db.execute(select(Category).where(Category.id == cat_id))
    db_cat = result.scalar_one_or_none()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for key, value in cat_in.model_dump().items():
        setattr(db_cat, key, value)
    
    await db.commit()
    await db.refresh(db_cat)
    
    return {
        "id": db_cat.id,
        "name": db_cat.name,
        "parent_id": db_cat.parent_id,
        "path": db_cat.path,
        "children": [] # Children will be re-fetched by the tree-builder logic
    }

@router.delete("/categories/{cat_id}")
async def delete_category(
    cat_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    result = await db.execute(select(Category).where(Category.id == cat_id))
    db_cat = result.scalar_one_or_none()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check for children
    child_check = await db.execute(select(Category).where(Category.parent_id == cat_id))
    if child_check.scalars().first():
         raise HTTPException(status_code=400, detail="Cannot delete category with sub-categories. Delete sub-categories first.")

    await db.delete(db_cat)
    await db.commit()
    return {"status": "success"}

@router.post("/classification-rules", response_model=schemas.AutoClassificationRule)
async def create_classification_rule(
    rule_in: schemas.AutoClassificationRuleBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    db_rule = AutoClassificationRule(**rule_in.model_dump())
    db.add(db_rule)
    await db.commit()
    await db.refresh(db_rule)
    
    return {
        "id": db_rule.id,
        "name": db_rule.name,
        "condition": db_rule.condition,
        "action": db_rule.action,
        "priority": db_rule.priority,
        "is_active": db_rule.is_active
    }

@router.delete("/classification-rules/{rule_id}")
async def delete_classification_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    result = await db.execute(select(AutoClassificationRule).where(AutoClassificationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.delete(rule)
    await db.commit()
    return {"status": "success"}

# --- Record Types ---

@router.get("/record-types", response_model=List[schemas.RecordType])
async def get_record_types(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(RecordType).options(selectinload(RecordType.fields))
    )
    return result.scalars().all()

@router.post("/record-types", response_model=schemas.RecordType)
async def create_record_type(
    rt_in: schemas.RecordTypeBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    db_rt = RecordType(**rt_in.model_dump())
    db.add(db_rt)
    await db.commit()
    await db.refresh(db_rt)
    
    return {
        "id": db_rt.id,
        "name": db_rt.name,
        "description": db_rt.description,
        "icon": db_rt.icon,
        "fields": [] # New record type has no fields yet
    }

@router.put("/record-types/{rt_id}", response_model=schemas.RecordType)
async def update_record_type(
    rt_id: uuid.UUID,
    rt_in: schemas.RecordTypeBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    # Load with fields to satisfy the response model if we want to return them,
    # or just return the updated core fields.
    result = await db.execute(
        select(RecordType)
        .options(selectinload(RecordType.fields))
        .where(RecordType.id == rt_id)
    )
    db_rt = result.scalar_one_or_none()
    if not db_rt:
        raise HTTPException(status_code=404, detail="Record Type not found")
    
    for key, value in rt_in.model_dump().items():
        setattr(db_rt, key, value)
    
    await db.commit()
    await db.refresh(db_rt)
    
    return db_rt # selectinload above should make this safe now

@router.delete("/record-types/{rt_id}")
async def delete_record_type(
    rt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    result = await db.execute(select(RecordType).where(RecordType.id == rt_id))
    db_rt = result.scalar_one_or_none()
    if not db_rt:
        raise HTTPException(status_code=404, detail="Record Type not found")
    
    # Optional: Check if records are using this type
    # For now, let's just delete
    await db.delete(db_rt)
    await db.commit()
    return {"status": "success"}

@router.post("/record-types/{rt_id}/fields", response_model=schemas.RecordTypeField)
async def add_field_to_record_type(
    rt_id: uuid.UUID,
    field_in: schemas.RecordTypeFieldBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    db_field = RecordTypeField(**field_in.model_dump(), record_type_id=rt_id)
    db.add(db_field)
    await db.commit()
    await db.refresh(db_field)
    return db_field

