import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from ..models.record import InventoryRecord
from ..models.master import AutoClassificationRule, Category

async def evaluate_rules_for_record(db: AsyncSession, record_id: uuid.UUID):
    """
    Evaluates all active auto-classification rules against a single record.
    """
    # 1. Fetch the record
    result = await db.execute(select(InventoryRecord).where(InventoryRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        return

    # 2. Fetch all active rules ordered by priority
    rules_result = await db.execute(
        select(AutoClassificationRule)
        .where(AutoClassificationRule.is_active == True)
        .order_by(AutoClassificationRule.priority.desc())
    )
    rules = rules_result.scalars().all()

    modified = False
    new_tags = set(record.tags or [])
    new_category_id = record.category_id

    for rule in rules:
        if await matches_condition(record, rule.condition):
            action = rule.action
            action_type = action.get("type")
            action_value = action.get("value")

            if action_type == "add_tag":
                if action_value not in new_tags:
                    new_tags.add(action_value)
                    modified = True
            elif action_type == "set_category":
                try:
                    cat_id = uuid.UUID(action_value)
                    if new_category_id != cat_id:
                        new_category_id = cat_id
                        modified = True
                except ValueError:
                    continue

    if modified:
        await db.execute(
            update(InventoryRecord)
            .where(InventoryRecord.id == record_id)
            .values(tags=list(new_tags), category_id=new_category_id)
        )
        await db.flush()

async def matches_condition(record: InventoryRecord, condition: Dict[str, Any]) -> bool:
    """
    Checks if a record matches a specific rule condition.
    Condition format: {"field": "description", "operator": "contains", "value": "invoice"}
    """
    field = condition.get("field")
    operator = condition.get("operator")
    value = condition.get("value")

    if not field or not operator:
        return False

    record_value = getattr(record, field, None)
    if record_value is None:
        return False

    record_value = str(record_value).lower()
    value = str(value).lower()

    if operator == "contains":
        return value in record_value
    elif operator == "equals":
        return value == record_value
    elif operator == "starts_with":
        return record_value.startswith(value)
    
    return False

async def run_auto_classification_batch(db: AsyncSession):
    """
    Finds records that haven't been processed or need re-evaluation.
    For Phase 1, we'll just process records created in the last hour.
    """
    # This is a placeholder for a more complex query in the future
    # For now, let's just fetch records with no category or tags
    result = await db.execute(
        select(InventoryRecord.id)
        .where(InventoryRecord.category_id == None)
        .limit(100)
    )
    record_ids = result.scalars().all()
    
    for rid in record_ids:
        await evaluate_rules_for_record(db, rid)
    
    await db.commit()
