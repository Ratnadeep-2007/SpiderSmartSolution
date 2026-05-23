import uuid
import collections
import re
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from ..models.record import InventoryRecord
from ..models.master import AutoClassificationRule, Category

def _apply_rule_action(record: InventoryRecord, action: Dict[str, Any]) -> bool:
    """
    Applies a rule action to a record. Returns True if modified.
    Consolidates logic for set_category and add_tag(s).
    """
    action_type = action.get("type", "").lower()
    action_value = action.get("value")
    if not action_value:
        return False
    
    modified = False
    if action_type == "set_category":
        try:
            cat_id = uuid.UUID(str(action_value))
            if record.category_id != cat_id:
                record.category_id = cat_id
                modified = True
        except (ValueError, TypeError):
            pass
    elif action_type in ["add_tag", "add_tags"]:
        tags = set(record.tags or [])
        # Support both single tag and comma-separated tags
        new_tags = [t.strip() for t in str(action_value).split(',') if t.strip()]
        before_len = len(tags)
        tags.update(new_tags)
        if len(tags) > before_len:
            record.tags = list(tags)
            modified = True
    return modified

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
    for rule in rules:
        if await matches_condition(record, rule.condition):
            if _apply_rule_action(record, rule.action):
                modified = True

    if modified:
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

async def discover_patterns(db: AsyncSession) -> List[Dict[str, Any]]:
    """
    Finds top 10 keywords in unclassified records.
    """
    result = await db.execute(
        select(InventoryRecord.description)
        .where(InventoryRecord.category_id == None)
        .limit(500)
    )
    descriptions = result.scalars().all()
    
    words = []
    for desc in descriptions:
        if desc:
            # Simple word extraction (4+ letters)
            words.extend(re.findall(r'\w{4,}', desc.lower()))
            
    counter = collections.Counter(words)
    common = counter.most_common(10)
    
    return [{"keyword": k, "count": c} for k, c in common]

async def simulate_rule(db: AsyncSession, condition: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulates a rule and returns impact statistics.
    """
    field = condition.get("field")
    operator = condition.get("operator")
    value = condition.get("value")
    
    # Base query for unclassified records
    query = select(InventoryRecord).where(InventoryRecord.category_id == None)
    
    if operator == "contains":
        query = query.where(getattr(InventoryRecord, field).ilike(f"%{value}%"))
    elif operator == "equals":
        query = query.where(getattr(InventoryRecord, field).ilike(value))
    elif operator == "starts_with":
        query = query.where(getattr(InventoryRecord, field).ilike(f"{value}%"))
        
    # Count matches
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    # Fetch some samples
    sample_result = await db.execute(query.limit(5))
    samples = [r.description for r in sample_result.scalars().all()]
    
    return {
        "total_count": total,
        "sample_records": samples
    }

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

async def apply_rule_retroactively(db: AsyncSession, rule_id: uuid.UUID):
    """
    Applies a rule to all existing matching records (where category is null).
    """
    result = await db.execute(select(AutoClassificationRule).where(AutoClassificationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        return 0
        
    condition = rule.condition
    field = condition.get("field")
    operator = condition.get("operator")
    value = condition.get("value")
    
    action = rule.action
    action_type = action.get("type", "").lower()
    action_value = action.get("value")
    
    if not field or not operator or not action_value:
        return 0

    # Target only untagged/uncategorized records as per spec
    query = select(InventoryRecord).where(InventoryRecord.category_id == None)
    
    if operator == "contains":
        query = query.where(getattr(InventoryRecord, field).ilike(f"%{value}%"))
    elif operator == "equals":
        query = query.where(getattr(InventoryRecord, field).ilike(value))
    elif operator == "starts_with":
        query = query.where(getattr(InventoryRecord, field).ilike(f"{value}%"))
        
    matching_result = await db.execute(query)
    records = matching_result.scalars().all()
    
    count = 0
    for record in records:
        if _apply_rule_action(record, rule.action):
            count += 1
            
    await db.commit()
    return count
