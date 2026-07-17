import os
import httpx
import logging
import time
import json
import re
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any

from ..database import get_db
from ..dependencies.auth import get_current_user
from ..models.user import User
from ..models.record import InventoryRecord
from ..models.master import Entity, Department, Location, Category, RecordType
from ..schemas.copilot import CopilotChatRequest, CopilotChatResponse, CopilotExecuteRequest
from ..config import settings
from ..services.audit_service import create_audit_log
from ..models.audit_log import AuditLog

# Initialize logger
logger = logging.getLogger("app.routers.copilot")
router = APIRouter(prefix="/copilot", tags=["copilot"])


def clean_response(text: str | None) -> str:
    """
    Trims whitespace from AI response text.
    """
    if not text:
        return ""
    return text.strip()

GEMINI_FUNCTIONS = [
    {
        "name": "search_records",
        "description": "Searches for physical inventory records matching a keyword query.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "query": {"type": "STRING", "description": "The search term or keywords (e.g. invoice, medical)."},
                "limit": {"type": "INTEGER", "description": "Maximum number of records to return (default 5)."}
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_record_details",
        "description": "Retrieves complete metadata and status details for a single record by its barcode.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "barcode": {"type": "STRING", "description": "The box_barcode or file_barcode."}
            },
            "required": ["barcode"]
        }
    },
    {
        "name": "query_audit_logs",
        "description": "Queries the system audit log history. Can filter to a specific record barcode.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "barcode": {"type": "STRING", "description": "Optional barcode to filter logs by record."},
                "limit": {"type": "INTEGER", "description": "Maximum number of log entries to retrieve (default 10)."}
            }
        }
    },
    {
        "name": "list_categories",
        "description": "Retrieves the list of all categories defined in the master data.",
        "parameters": {"type": "OBJECT", "properties": {}}
    },
    {
        "name": "list_locations",
        "description": "Retrieves the list of active warehouse locations.",
        "parameters": {"type": "OBJECT", "properties": {}}
    },
    {
        "name": "list_departments",
        "description": "Retrieves the list of active departments.",
        "parameters": {"type": "OBJECT", "properties": {}}
    },
    {
        "name": "apply_legal_hold",
        "description": "Applies a legal hold to a record by barcode, blocking deletion/modification.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "barcode": {"type": "STRING", "description": "The box or file barcode."},
                "reason": {"type": "STRING", "description": "The legal or audit reason for the hold."}
            },
            "required": ["barcode", "reason"]
        }
    },
    {
        "name": "remove_legal_hold",
        "description": "Removes a legal hold from a record by barcode, resuming standard retention.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "barcode": {"type": "STRING", "description": "The box or file barcode."},
                "reason": {"type": "STRING", "description": "The reason for lifting the hold."}
            },
            "required": ["barcode", "reason"]
        }
    },
    {
        "name": "set_category",
        "description": "Assigns a category to a record by barcode.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "barcode": {"type": "STRING", "description": "The box or file barcode."},
                "category_name": {"type": "STRING", "description": "Name of the category to assign."}
            },
            "required": ["barcode", "category_name"]
        }
    },
    {
        "name": "add_tag",
        "description": "Appends a new tag to a record by barcode.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "barcode": {"type": "STRING", "description": "The box or file barcode."},
                "tag_name": {"type": "STRING", "description": "The tag text to add."}
            },
            "required": ["barcode", "tag_name"]
        }
    },
    {
        "name": "create_record",
        "description": "Creates a new physical inventory record in the system.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "box_barcode": {"type": "STRING", "description": "Unique Box Barcode."},
                "file_barcode": {"type": "STRING", "description": "Unique File Barcode."},
                "description": {"type": "STRING", "description": "Detailed description of contents."},
                "record_date": {"type": "STRING", "description": "Date of record creation (YYYY-MM-DD)."},
                "entity": {"type": "STRING", "description": "Optional Entity name (defaults to Spider Smart)."},
                "department": {"type": "STRING", "description": "Optional Department name (defaults to Finance)."},
                "location": {"type": "STRING", "description": "Optional Location name (defaults to Warehouse A)."}
            },
            "required": ["box_barcode", "file_barcode", "description", "record_date"]
        }
    },
    {
        "name": "edit_record",
        "description": "Edits metadata description, entity, department, or location of an existing record.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "barcode": {"type": "STRING", "description": "The target box or file barcode."},
                "description": {"type": "STRING", "description": "New description text."},
                "entity": {"type": "STRING", "description": "New entity name."},
                "department": {"type": "STRING", "description": "New department name."},
                "location": {"type": "STRING", "description": "New location name."}
            },
            "required": ["barcode"]
        }
    },
    {
        "name": "dispose_record",
        "description": "Disposes a record that is currently marked as DUE.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "barcode": {"type": "STRING", "description": "The box or file barcode."}
            },
            "required": ["barcode"]
        }
    },
    {
        "name": "create_location",
        "description": "Creates a new active warehouse storage location.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "location_name": {"type": "STRING", "description": "Name of the location."}
            },
            "required": ["location_name"]
        }
    },
    {
        "name": "create_category",
        "description": "Creates a new record classification category.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "category_name": {"type": "STRING", "description": "Name of the category."}
            },
            "required": ["category_name"]
        }
    },
    {
        "name": "trigger_retention_sweep",
        "description": "Manually triggers the system retention sweep to flag expired records as DUE.",
        "parameters": {"type": "OBJECT", "properties": {}}
    },
    {
        "name": "list_record_versions",
        "description": "Lists the previous version snapshots and change history of a record by barcode.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "barcode": {"type": "STRING", "description": "The box or file barcode."}
            },
            "required": ["barcode"]
        }
    },
    {
        "name": "revert_record_version",
        "description": "Reverts a record back to a specific past version snapshot. Note: requires SYSTEM_ADMIN approval.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "barcode": {"type": "STRING", "description": "The box or file barcode."},
                "version": {"type": "INTEGER", "description": "The target version number to revert to."}
            },
            "required": ["barcode", "version"]
        }
    }
]

# Helper functions for AI Copilot Read Tools
async def search_records_tool(db: AsyncSession, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    # Attempt Semantic Search first using Gemini Embeddings
    from ..services.embedding_service import get_embedding
    try:
        query_emb = await get_embedding(query)
        if query_emb:
            stmt = (
                select(InventoryRecord)
                .where(
                    InventoryRecord.is_active == True,
                    InventoryRecord.embedding != None
                )
                .order_by(InventoryRecord.embedding.cosine_distance(query_emb).asc())
                .limit(limit)
            )
            result = await db.execute(stmt)
            records = result.scalars().all()
            if records:
                return [
                    {
                        "id": str(r.id),
                        "box_barcode": r.box_barcode,
                        "file_barcode": r.file_barcode,
                        "description": r.description,
                        "entity": r.entity,
                        "department": r.department,
                        "location": r.location,
                        "disposition_status": r.disposition_status,
                        "legal_hold": r.legal_hold,
                        "tags": r.tags
                    }
                    for r in records
                ]
    except Exception as sem_err:
        logger.error(f"Semantic search in copilot failed, falling back to pattern matching: {str(sem_err)}")

    # Fallback to pattern matching
    stmt = (
        select(InventoryRecord)
        .where(
            InventoryRecord.is_active == True,
            (InventoryRecord.description.ilike(f"%{query}%")) |
            (InventoryRecord.box_barcode.ilike(f"%{query}%")) |
            (InventoryRecord.file_barcode.ilike(f"%{query}%")) |
            (InventoryRecord.entity.ilike(f"%{query}%")) |
            (InventoryRecord.department.ilike(f"%{query}%")) |
            (InventoryRecord.location.ilike(f"%{query}%"))
        )
        .limit(limit)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "box_barcode": r.box_barcode,
            "file_barcode": r.file_barcode,
            "description": r.description,
            "entity": r.entity,
            "department": r.department,
            "location": r.location,
            "disposition_status": r.disposition_status,
            "legal_hold": r.legal_hold,
            "tags": r.tags
        }
        for r in records
    ]

async def list_record_versions_tool(db: AsyncSession, barcode: str) -> List[Dict[str, Any]]:
    stmt = select(InventoryRecord).where(
        (InventoryRecord.box_barcode == barcode) |
        (InventoryRecord.file_barcode == barcode)
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    if not record:
        return [{"error": f"Record with barcode '{barcode}' not found."}]
        
    from ..services.record_service import get_record_versions
    versions = await get_record_versions(db, record.id)
    return [
        {
            "version": v.version,
            "created_at": str(v.created_at),
            "created_by": str(v.created_by),
            "data_snapshot": v.data_snapshot
        }
        for v in versions
    ]

async def get_record_details_tool(db: AsyncSession, barcode: str) -> Dict[str, Any]:
    stmt = select(InventoryRecord).where(
        (InventoryRecord.box_barcode == barcode) |
        (InventoryRecord.file_barcode == barcode)
    )
    result = await db.execute(stmt)
    r = result.scalar_one_or_none()
    if not r:
        return {"error": f"Record with barcode '{barcode}' not found."}
    return {
        "id": str(r.id),
        "box_barcode": r.box_barcode,
        "file_barcode": r.file_barcode,
        "description": r.description,
        "entity": r.entity,
        "department": r.department,
        "location": r.location,
        "disposition_status": r.disposition_status,
        "legal_hold": r.legal_hold,
        "tags": r.tags,
        "record_date": str(r.record_date),
        "is_active": r.is_active,
        "created_by": str(r.created_by),
        "updated_by": str(r.updated_by)
    }

async def list_categories_tool(db: AsyncSession) -> List[Dict[str, Any]]:
    stmt = select(Category)
    result = await db.execute(stmt)
    categories = result.scalars().all()
    return [{"id": str(c.id), "name": c.name} for c in categories]

async def list_locations_tool(db: AsyncSession) -> List[Dict[str, Any]]:
    stmt = select(Location).where(Location.is_active == True)
    result = await db.execute(stmt)
    locations = result.scalars().all()
    return [{"id": str(l.id), "name": l.name} for l in locations]

async def list_departments_tool(db: AsyncSession) -> List[Dict[str, Any]]:
    stmt = select(Department).where(Department.is_active == True)
    result = await db.execute(stmt)
    depts = result.scalars().all()
    return [{"id": str(d.id), "name": d.name, "entity_id": str(d.entity_id)} for d in depts]

async def query_audit_logs_tool(db: AsyncSession, barcode: str = None, limit: int = 10) -> Any:
    query = select(AuditLog)
    if barcode:
        rec_stmt = select(InventoryRecord.id).where(
            (InventoryRecord.box_barcode == barcode) |
            (InventoryRecord.file_barcode == barcode)
        )
        rec_res = await db.execute(rec_stmt)
        rec_id = rec_res.scalar_one_or_none()
        if rec_id:
            query = query.where(AuditLog.record_id == rec_id)
        else:
            return {"error": f"Record with barcode '{barcode}' not found."}
    
    query = query.order_by(AuditLog.performed_at.desc()).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    return [
        {
            "id": str(l.id),
            "record_id": str(l.record_id) if l.record_id else None,
            "action": l.action,
            "performed_by": str(l.performed_by),
            "performed_at": str(l.performed_at),
            "changes": l.changes,
            "tamper_hash": l.tamper_hash
        }
        for l in logs
    ]


def get_platform_docs_comprehensive() -> str:
    """
    Returns a comprehensive system guide with step-by-step instructions.
    Explains all features so the Copilot can guide users on every capability.
    """
    return (
        "=== COMPREHENSIVE PLATFORM BLUEPRINT & HOW-TO GUIDE ===\n"
        "1. USER ACCOUNTS & SECURITY:\n"
        "   - Default Admin: admin@spidersmart.com / admin123\n"
        "   - Roles: SYSTEM_ADMIN (full access), RECORDS_MANAGER (CRUD records/master data), AUDITOR (read-only audit trail), KNOWLEDGE_WORKER (CRUD records).\n"
        "2. INVENTORY REGISTRY & RECORDS:\n"
        "   - Tracks physical assets (Box Barcode & File Barcode required, must be unique).\n"
        "   - Dynamic Fields: Schema-based record types (Physical Box, Individual File, Digital Media) support custom metadata fields.\n"
        "   - How to Create/Edit: Go to the Records page (`/records`), click 'Add Record', fill in barcodes and metadata. To edit, click edit on a record row.\n"
        "3. RETENTION & LEGAL HOLDS:\n"
        "   - Retention policies (e.g. 7-year retention) automatically calculate expiration dates. Nightly sweeps flag records past their retention date as 'DUE'.\n"
        "   - Legal Holds: Blocks any modifications or deletions of records. Halts the disposition sweep.\n"
        "   - How to place a Legal Hold: Go to the Audit & Holds page (`/audit`), search for a record by barcode, and click 'Place Hold'. Explain the reason when prompted.\n"
        "   - How to dispose of records: Admins/Records Managers can navigate to the Retention dashboard to view records marked 'DUE' and click 'Dispose' to mark them as 'DISPOSED' (which moves them to inactive status).\n"
        "4. AUDIT TRAIL:\n"
        "   - Immutable, tamper-evident audit log using SHA-256 cryptographic chaining (each log stores a tamper_hash of its content + the previous log's hash).\n"
        "   - How to view/export: Go to the Audit & Holds page (`/audit`) to view logs or export them as a CSV for forensic compliance audits.\n"
        "5. BULK DATA IMPORT (UPLOAD RECORDS IN BULK):\n"
        "   - Support: Users can upload .csv or .xlsx spreadsheets to create multiple inventory records at once.\n"
        "   - Step-by-Step Bulk Upload Process:\n"
        "     1. Navigate to the Import page (`/import`) using the sidebar or browser URL.\n"
        "     2. Upload File: Drag and drop or browse to select your CSV or Excel file. The system will parse and show a data preview.\n"
        "     3. Map Fields: Select which column in your file maps to the required system fields (e.g. Box Barcode -> your file's box barcode column, Description -> your description column, etc.).\n"
        "     4. Default Fallbacks: Set optional default values (e.g., fallback Entity or Location) to use if your file has missing values.\n"
        "     5. Process & Review: Click 'Start Import Process'. When completed, review the success count and the Error Log indicating any row validation failures.\n"
        "6. ANALYTICS & REPORTS:\n"
        "   - Custom Report Builder: Go to the Reports page (`/reports`), select groups, columns, and date filters, and click 'Build'.\n"
        "   - Export formats: Custom reports can be downloaded as Excel or PDF documents.\n"
        "   - Scheduled Exports: Create cron-based schedules (e.g., weekly) on the Reports page to automatically generate and export reports.\n"
        "7. SYSTEM NAVIGATION & ROUTES:\n"
        "   - `/records` - View, filter, and search inventory list.\n"
        "   - `/audit` - View tamper-evident audit trail, manage legal holds, and export forensic logs.\n"
        "   - `/reports` - Custom report builder, Excel/PDF export, and scheduled cron exports.\n"
        "   - `/import` - Bulk CSV/XLSX data upload and field mapping wizard.\n"
        "   - `/admin/users` - User management panel.\n"
        "   - `/admin/master` - Entity, Department, and Location CRUD.\n"
        "   - `/admin/classification` - Custom rules engine for automated record categorization."
    )

async def get_db_context(db: AsyncSession) -> Dict[str, Any]:
    # Total active records
    total_result = await db.execute(select(func.count()).select_from(InventoryRecord).where(InventoryRecord.is_active == True))
    total_records = total_result.scalar_one()

    # Active holds
    holds_result = await db.execute(select(func.count()).select_from(InventoryRecord).where(InventoryRecord.legal_hold == True, InventoryRecord.is_active == True))
    holds_count = holds_result.scalar_one()

    # Due for disposition
    due_result = await db.execute(select(func.count()).select_from(InventoryRecord).where(InventoryRecord.disposition_status == "DUE", InventoryRecord.is_active == True))
    due_count = due_result.scalar_one()

    # Get master entities
    entities_result = await db.execute(select(Entity.name).where(Entity.is_active == True).limit(3))
    entities = entities_result.scalars().all()

    # Get departments
    depts_result = await db.execute(select(Department.name).where(Department.is_active == True).limit(3))
    departments = depts_result.scalars().all()

    return {
        "total_records": total_records,
        "holds_count": holds_count,
        "due_count": due_count,
        "entities": entities,
        "departments": departments
    }

async def run_tool_action(db: AsyncSession, action_data: Dict[str, Any], user_id: uuid.UUID) -> str:
    """
    Executes database write actions requested by the Copilot.
    """
    action = action_data.get("action")
    barcode = action_data.get("barcode")
    reason = action_data.get("reason", "Action performed by Copilot")
    
    # Standard barcode-dependent read/updates
    record = None
    if barcode:
        result = await db.execute(
            select(InventoryRecord).where(
                (InventoryRecord.box_barcode == barcode) |
                (InventoryRecord.file_barcode == barcode)
            )
        )
        record = result.scalar_one_or_none()
        
    if action == "apply_legal_hold":
        if not record:
            return f"Error: Barcode '{barcode}' not found."
        if record.legal_hold:
            return f"Record '{barcode}' is already on hold."
        record.legal_hold = True
        await create_audit_log(
            db,
            action="LEGAL_HOLD_APPLIED",
            performed_by=user_id,
            record_id=record.id,
            changes={"reason": reason, "triggered_by": "Copilot"}
        )
        await db.commit()
        return f"Success: Placed '{barcode}' on legal hold. Reason: {reason}."
        
    elif action == "remove_legal_hold":
        if not record:
            return f"Error: Barcode '{barcode}' not found."
        if not record.legal_hold:
            return f"Record '{barcode}' is not on hold."
        record.legal_hold = False
        await create_audit_log(
            db,
            action="LEGAL_HOLD_REMOVED",
            performed_by=user_id,
            record_id=record.id,
            changes={"reason": reason, "triggered_by": "Copilot"}
        )
        await db.commit()
        return f"Success: Removed hold from '{barcode}'. Reason: {reason}."
        
    elif action == "set_category":
        if not record:
            return f"Error: Barcode '{barcode}' not found."
        category_name = action_data.get("category_name")
        if not category_name:
            return "Error: Missing category name."
        cat_result = await db.execute(select(Category).where(Category.name.ilike(category_name)))
        category = cat_result.scalar_one_or_none()
        if not category:
            return f"Error: Category '{category_name}' not found."
        
        old_cat_id = str(record.category_id) if record.category_id else None
        record.category_id = category.id
        await create_audit_log(
            db,
            action="UPDATE",
            performed_by=user_id,
            record_id=record.id,
            changes={"category_id": {"old": old_cat_id, "new": str(category.id)}, "triggered_by": "Copilot"}
        )
        await db.commit()
        return f"Success: Updated category of '{barcode}' to '{category.name}'."
        
    elif action == "add_tag":
        if not record:
            return f"Error: Barcode '{barcode}' not found."
        tag_name = action_data.get("tag_name")
        if not tag_name:
            return "Error: Missing tag name."
        
        tags = set(record.tags or [])
        if tag_name in tags:
            return f"Record '{barcode}' already has tag '{tag_name}'."
            
        tags.add(tag_name)
        record.tags = list(tags)
        await create_audit_log(
            db,
            action="UPDATE",
            performed_by=user_id,
            record_id=record.id,
            changes={"tags_added": [tag_name], "triggered_by": "Copilot"}
        )
        await db.commit()
        return f"Success: Added tag '{tag_name}' to '{barcode}'."

    elif action == "create_record":
        box_barcode = action_data.get("box_barcode")
        file_barcode = action_data.get("file_barcode")
        description = action_data.get("description")
        record_date_str = action_data.get("record_date")
        entity_name = action_data.get("entity", "Spider Smart")
        dept_name = action_data.get("department", "Finance")
        loc_name = action_data.get("location", "Warehouse A")
        
        if not box_barcode or not file_barcode or not description or not record_date_str:
            return "Error: Missing box_barcode, file_barcode, description, or record_date."
            
        try:
            record_date = datetime.strptime(record_date_str, "%Y-%m-%d").date()
        except ValueError:
            return "Error: record_date must be in YYYY-MM-DD format."
            
        # Look up a record type
        rt_result = await db.execute(select(RecordType).limit(1))
        record_type = rt_result.scalar_one_or_none()
        if not record_type:
            return "Error: No RecordType found in database."
            
        # Find or create Entity
        ent_result = await db.execute(select(Entity).where(Entity.name.ilike(entity_name)))
        entity = ent_result.scalar_one_or_none()
        if not entity:
            entity = Entity(name=entity_name, entity_code=entity_name[:3].upper(), is_active=True)
            db.add(entity)
            await db.flush()
            
        # Find or create Department
        dept_result = await db.execute(select(Department).where(Department.name.ilike(dept_name)))
        dept = dept_result.scalar_one_or_none()
        if not dept:
            dept = Department(name=dept_name, entity_id=entity.id, is_active=True)
            db.add(dept)
            await db.flush()
            
        # Find or create Location
        loc_result = await db.execute(select(Location).where(Location.name.ilike(loc_name)))
        location = loc_result.scalar_one_or_none()
        if not location:
            location = Location(name=loc_name, is_active=True)
            db.add(location)
            await db.flush()
            
        new_record = InventoryRecord(
            record_type_id=record_type.id,
            entity_id=entity.id,
            department_id=dept.id,
            entity=entity.name,
            entity_code=entity.entity_code,
            department=dept.name,
            location=location.name,
            box_barcode=box_barcode,
            file_barcode=file_barcode,
            description=description,
            record_date=record_date,
            created_by=user_id,
            updated_by=user_id
        )
        db.add(new_record)
        await db.flush()
        
        await create_audit_log(
            db,
            action="CREATE",
            performed_by=user_id,
            record_id=new_record.id,
            changes={"box_barcode": box_barcode, "file_barcode": file_barcode, "description": description}
        )
        await db.commit()
        return f"Success: Created new inventory record for box '{box_barcode}'."

    elif action == "edit_record":
        if not record:
            return f"Error: Barcode '{barcode}' not found."
            
        description = action_data.get("description")
        entity_name = action_data.get("entity")
        dept_name = action_data.get("department")
        loc_name = action_data.get("location")
        
        changes = {}
        if description:
            record.description = description
            changes["description"] = description
        if entity_name:
            record.entity = entity_name
            changes["entity"] = entity_name
        if dept_name:
            record.department = dept_name
            changes["department"] = dept_name
        if loc_name:
            record.location = loc_name
            changes["location"] = loc_name
            
        if not changes:
            return "Error: No fields provided to update."
            
        record.updated_by = user_id
        await create_audit_log(
            db,
            action="UPDATE",
            performed_by=user_id,
            record_id=record.id,
            changes=changes
        )
        await db.commit()
        return f"Success: Updated record '{barcode}' fields: {', '.join(changes.keys())}."

    elif action == "dispose_record":
        if not record:
            return f"Error: Barcode '{barcode}' not found."
        if record.legal_hold:
            return f"Error: Cannot dispose record '{barcode}' because it is under active Legal Hold."
        if record.disposition_status != "DUE":
            return f"Error: Record '{barcode}' is not marked as DUE for disposition."
            
        record.disposition_status = "DISPOSED"
        record.is_active = False
        
        await create_audit_log(
            db,
            action="DISPOSE",
            performed_by=user_id,
            record_id=record.id,
            changes={"status_change": "DISPOSED"}
        )
        await db.commit()
        return f"Success: Disposed record '{barcode}'."

    elif action == "create_location":
        location_name = action_data.get("location_name")
        if not location_name:
            return "Error: Missing location_name parameter."
        loc_result = await db.execute(select(Location).where(Location.name.ilike(location_name)))
        location = loc_result.scalar_one_or_none()
        if location:
            return f"Location '{location_name}' already exists."
        new_loc = Location(name=location_name, is_active=True)
        db.add(new_loc)
        await db.commit()
        return f"Success: Created new location '{location_name}'."
        
    elif action == "create_category":
        category_name = action_data.get("category_name")
        if not category_name:
            return "Error: Missing category_name parameter."
        cat_result = await db.execute(select(Category).where(Category.name.ilike(category_name)))
        category = cat_result.scalar_one_or_none()
        if category:
            return f"Category '{category_name}' already exists."
        new_cat = Category(name=category_name)
        db.add(new_cat)
        await db.commit()
        return f"Success: Created new category '{category_name}'."

    elif action == "trigger_retention_sweep":
        from ..services.retention_service import sweep_retention_dates
        count = await sweep_retention_dates(db)
        return f"Success: Triggered retention sweep. Marked {count} records as DUE."
        
    elif action == "revert_record_version":
        if not record:
            return f"Error: Barcode '{barcode}' not found."
        version_num = action_data.get("version")
        if version_num is None:
            return "Error: Missing version number."
        try:
            version_num = int(version_num)
        except ValueError:
            return "Error: Version number must be an integer."
            
        from ..services.record_service import revert_to_version
        reverted_record = await revert_to_version(db, record.id, version_num, user_id)
        if not reverted_record:
            return f"Error: Version '{version_num}' not found for record '{barcode}' or user lacks permissions."
        return f"Success: Reverted record '{barcode}' to version {version_num} snapshot."
        
    return f"Error: Unknown action '{action}'."

@router.post("/chat", response_model=CopilotChatResponse)
async def chat_with_copilot(
    payload: CopilotChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_time = time.time()
    msg = payload.message.strip().lower()
    
    logger.info(f"Copilot Chat Request - User: {current_user.email} | Msg: '{payload.message[:50]}...'")
    
    # 1. Fetch live DB context stats
    try:
        context = await get_db_context(db)
    except Exception as db_err:
        logger.error(f"Failed to fetch db context: {str(db_err)}")
        context = {"total_records": 0, "holds_count": 0, "due_count": 0, "entities": [], "departments": []}
    
    # 2. Check if we have AI API keys
    nvidia_api_key = settings.NVIDIA_API_KEY or os.getenv("NVIDIA_API_KEY")
    gemini_api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    
    # Gather comprehensive platform documentation
    platform_docs = get_platform_docs_comprehensive()

    # --- Gemini-specific system prompt (clean: no conflicting JSON-block instructions) ---
    # The Gemini API already knows about tools via functionDeclarations.
    # Adding raw JSON instructions alongside native function calling confuses the model.
    gemini_system_prompt = (
        "You are the SpiderSmart IMS Copilot, an expert AI assistant for a physical Inventory Management System.\n"
        f"Current user: {current_user.email} (Role: {current_user.role})\n\n"
        "=== LIVE DATABASE SNAPSHOT ===\n"
        f"- Active records: {context['total_records']} | Records on legal hold: {context['holds_count']} | Records due for disposal: {context['due_count']}\n"
        f"- Entities in system: {', '.join(context['entities']) or 'None yet'} | Departments: {', '.join(context['departments']) or 'None yet'}\n\n"
        f"{platform_docs}\n\n"
        "=== BEHAVIOUR RULES ===\n"
        "- For read queries (find records, list categories, get audit logs etc.) call the appropriate read function. The result will be returned to you so you can form a response.\n"
        "- For write actions (create record, place hold, add tag, dispose, revert version etc.) call the appropriate write function. The system will present a confirmation dialog to the user before executing.\n"
        "- NEVER output raw JSON blocks to describe tool calls. Always use your native function-calling capability.\n"
        "- If the user request is missing required information (e.g. barcodes for a new record), ask clarifying questions before triggering any function.\n"
        "- Use markdown formatting in your text responses: **bold**, bullet lists, numbered steps. The UI renders markdown properly.\n"
        "- Be concise but thorough. Guide users step-by-step when explaining how to use a feature."
    )

    # --- Nvidia / text-based fallback system prompt (verbose, JSON-block based) ---
    nvidia_system_prompt = (
        "You are the SpiderSmart IMS Copilot, an AI assistant for an Inventory Management System.\n"
        f"User: {current_user.email} ({current_user.role})\n\n"
        "DB STATS:\n"
        f"- Active records: {context['total_records']} | Holds: {context['holds_count']} | Due: {context['due_count']}\n"
        f"- Entities (sample): {', '.join(context['entities'])} | Depts (sample): {', '.join(context['departments'])}\n\n"
        f"{platform_docs}\n\n"
        "=== EXECUTING WRITE ACTIONS ===\n"
        "To perform database write tasks on behalf of the user, output EXACTLY this JSON block. Do not use backticks or markdown quotes around it:\n"
        "{\n"
        '  "tool_call": {\n'
        '    "action": "apply_legal_hold" | "remove_legal_hold" | "set_category" | "add_tag" | "create_record" | "edit_record" | "dispose_record" | "create_location" | "create_category" | "trigger_retention_sweep",\n'
        '    "barcode": "BARCODE_VALUE",\n'
        '    "reason": "Reason text",\n'
        '    "category_name": "Category value",\n'
        '    "tag_name": "Tag value",\n'
        '    "box_barcode": "Barcode for new box record",\n'
        '    "file_barcode": "Barcode for new file record",\n'
        '    "description": "Description for new/edited record",\n'
        '    "record_date": "YYYY-MM-DD",\n'
        '    "entity": "Entity name",\n'
        '    "department": "Department name",\n'
        '    "location": "Location name"\n'
        "  }\n"
        "}\n\n"
        "=== OUTPUT STYLE RULES (CRITICAL) ===\n"
        "- Be helpful, clear, and comprehensive.\n"
        "- Use numbered lists and bullet points.\n"
        "- Use markdown formatting (**bold**, lists).\n"
        "- If you are outputting a tool JSON block, output ONLY that raw JSON and nothing else."
    )
    
    ai_text = ""
    pending_action = None
    actions = []
    fetched_records = None
    fetched_audit_logs = None
    
    # Per-model timeouts — 2.5-Pro is a thinking model, needs more time
    GEMINI_TIMEOUTS = {
        "gemini-2.5-pro": 40.0,
        "gemini-1.5-pro": 30.0,
        "gemini-2.5-flash": 15.0,
        "gemini-1.5-flash": 10.0,
    }

    if gemini_api_key:
        # 1. Native Gemini Function Calling flow (Prioritized)
        # History is sent as actual conversation turns; system context via systemInstruction
        contents = []
        for hist in payload.history:
            role = "user" if hist.role == "user" else "model"
            contents.append({"role": role, "parts": [{"text": hist.content}]})
        contents.append({"role": "user", "parts": [{"text": payload.message}]})

        max_iterations = 5
        for iteration in range(max_iterations):
            current_response = ""
            fn_call = None

            # Call Gemini generateContent API
            # Start with flash models (faster, cheaper) — Pro last as fallback
            for model_name in ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-pro"]:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_api_key}"
                    payload_data = {
                        "systemInstruction": {"parts": [{"text": gemini_system_prompt}]},
                        "contents": contents,
                        "tools": [{"functionDeclarations": GEMINI_FUNCTIONS}],
                        "toolConfig": {"functionCallingConfig": {"mode": "AUTO"}}
                    }
                    async with httpx.AsyncClient() as client:
                        resp = await client.post(
                            url, json=payload_data,
                            headers={"Content-Type": "application/json"},
                            timeout=GEMINI_TIMEOUTS.get(model_name, 15.0)
                        )
                    if resp.status_code == 200:
                        res_json = resp.json()
                        candidate = res_json["candidates"][0]
                        content_res = candidate.get("content", {})
                        parts = content_res.get("parts", [])
                        # Scan ALL parts — thinking models return thoughts first,
                        # then the real text/functionCall in a later part
                        for part in parts:
                            if "functionCall" in part:
                                fn_call = part["functionCall"]
                                break
                            elif "text" in part and part["text"].strip():
                                current_response = part["text"]
                                # Don't break — keep scanning in case functionCall appears later
                        # If we got something useful, stop trying other models
                        if fn_call or current_response:
                            logger.info(f"Copilot: got response from {model_name}")
                            break
                        else:
                            finish_reason = candidate.get("finishReason", "UNKNOWN")
                            logger.warning(f"Gemini {model_name}: empty response, finishReason={finish_reason}")
                    else:
                        logger.warning(f"Gemini {model_name} returned status {resp.status_code}: {resp.text[:200]}")
                except Exception as e:
                    logger.error(f"Gemini Call failed for {model_name}: {str(e)}")

            if not fn_call and not current_response:
                break

            if fn_call:
                tool_name = fn_call["name"]
                args = fn_call.get("args", {})
                
                # Check if it is a write function (Action confirmation required)
                write_functions = {
                    "apply_legal_hold", "remove_legal_hold", "set_category",
                    "add_tag", "create_record", "edit_record", "dispose_record",
                    "create_location", "create_category", "trigger_retention_sweep",
                    "revert_record_version"
                }
                
                if tool_name in write_functions:
                    pending_action = {
                        "action": tool_name,
                        **args
                    }
                    action_display = tool_name.replace("_", " ").upper()
                    barcode_str = f" for barcode '{args.get('barcode')}'" if args.get('barcode') else ""
                    ai_text = f"I've prepared the database action: **{action_display}**{barcode_str}.\n\n⚠️ **Action requires your permission.**"
                    break
                
                # It is a read function (Run automatically and supply response)
                logger.info(f"Executing read function: {tool_name} with args: {args}")
                tool_result = None
                
                try:
                    if tool_name == "search_records":
                        tool_result = await search_records_tool(db, args.get("query", ""), args.get("limit", 5))
                        fetched_records = tool_result
                    elif tool_name == "get_record_details":
                        tool_result = await get_record_details_tool(db, args.get("barcode", ""))
                        if "error" not in tool_result:
                            fetched_records = [tool_result]
                    elif tool_name == "list_record_versions":
                        tool_result = await list_record_versions_tool(db, args.get("barcode", ""))
                    elif tool_name == "list_categories":
                        tool_result = await list_categories_tool(db)
                    elif tool_name == "list_locations":
                        tool_result = await list_locations_tool(db)
                    elif tool_name == "list_departments":
                        tool_result = await list_departments_tool(db)
                    elif tool_name == "query_audit_logs":
                        tool_result = await query_audit_logs_tool(db, args.get("barcode"), args.get("limit", 10))
                        if isinstance(tool_result, list):
                            fetched_audit_logs = tool_result
                    else:
                        tool_result = {"error": f"Unknown tool '{tool_name}'"}
                except Exception as t_err:
                    logger.error(f"Error executing tool {tool_name}: {str(t_err)}")
                    tool_result = {"error": f"Internal execution error: {str(t_err)}"}

                # Update conversation turns for next loop iteration
                contents.append({
                    "role": "model",
                    "parts": [{"functionCall": {"name": tool_name, "args": args}}]
                })
                contents.append({
                    "role": "user",
                    "parts": [{
                        "functionResponse": {
                            "name": tool_name,
                            "response": {
                                "output": tool_result
                            }
                        }
                    }]
                })
                continue
            
            if current_response:
                ai_text = current_response
                break

    elif nvidia_api_key:
        # 2. Text-based Nvidia Nemotron flow (Fallback)
        messages = [
            {"role": "system", "content": nvidia_system_prompt}
        ]
        for hist in payload.history:
            role = "user" if hist.role == "user" else "assistant"
            messages.append({"role": role, "content": hist.content})
        messages.append({"role": "user", "content": payload.message})

        try:
            url = "https://integrate.api.nvidia.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {nvidia_api_key}" if nvidia_api_key != "local-ollama" else "Bearer DUMMY",
                "Content-Type": "application/json"
            }
            if nvidia_api_key == "local-ollama":
                url = "http://localhost:11434/v1/chat/completions"
            
            json_body = {
                "model": settings.NVIDIA_MODEL,
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 512
            }
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=json_body, headers=headers, timeout=12.0)
            if resp.status_code == 200:
                current_response = resp.json()["choices"][0]["message"]["content"]
                ai_text = current_response
        except Exception as e:
            logger.error(f"Nvidia NIM API call failed: {str(e)}")

        # Handle Intercepted Tool Calls in LLM Response (PROPOSE ONLY, NO EXECUTION YET)
        if ai_text:
            tool_call_match = re.search(r'\{\s*"tool_call"\s*:\s*(\{.*?\})\s*\}', ai_text, re.DOTALL)
            if tool_call_match:
                try:
                    tool_data = json.loads(tool_call_match.group(1))
                    logger.info(f"Intercepted Copilot tool call proposal: {tool_data}")
                    
                    # Strip the raw JSON block
                    clean_reply = ai_text.replace(tool_call_match.group(0), "").strip()
                    action_name = tool_data.get("action", "").replace("_", " ").upper()
                    barcode_str = f" for record '{tool_data.get('barcode')}'" if tool_data.get('barcode') else ""
                    
                    ai_text = clean_reply if clean_reply else f"I have prepared the action: **{action_name}**{barcode_str}."
                    ai_text += "\n\n⚠️ **Action requires your permission to proceed.** Please confirm or cancel below."
                    pending_action = tool_data
                except Exception as json_err:
                    logger.error(f"Tool parse failed: {str(json_err)}")
                    ai_text += "\n\n⚠️ **System Status:** Proposed tool arguments were malformed."
            else:
                ai_text = re.sub(r'```json.*?```', '', ai_text, flags=re.DOTALL).strip()

    # Suggest navigation chips
    if ai_text:
        if "hold" in msg:
            actions.append({"label": "View Legal Holds", "route": "/audit"})
        if "report" in msg:
            actions.append({"label": "Create a Report", "route": "/reports"})
        if "import" in msg:
            actions.append({"label": "Go to CSV Import", "route": "/import"})
        if "record" in msg or "search" in msg:
            actions.append({"label": "View Records", "route": "/records"})
    
    logger.info(f"Copilot Request Completed in {time.time() - start_time:.2f}s")

    # ── Offline Semantic Fallback ─────────────────────────────────────────────
    # Reached when no LLM key is configured OR all LLM calls returned empty
    if not ai_text:
        fallback_start = time.time()
        response_text = ""

        # Offline Command Execution (Proposed confirmation)
        if msg.startswith("hold ") or msg.startswith("unhold ") or msg.startswith("tag ") or msg.startswith("categorize ") or msg.startswith("create "):
            words = msg.split()
            cmd = words[0]
            barcode = words[1] if len(words) > 1 else ""

            if cmd == "create":
                # Expecting format: create [box_barcode] [file_barcode] [description...]
                parts = msg.split(maxsplit=3)
                if len(parts) >= 4:
                    box_barcode = parts[1]
                    file_barcode = parts[2]
                    desc = parts[3]
                    from datetime import date
                    today_str = date.today().isoformat()
                    tool_data = {
                        "action": "create_record",
                        "box_barcode": box_barcode.upper(),
                        "file_barcode": file_barcode.upper(),
                        "description": desc,
                        "record_date": today_str,
                        "entity": "Spider Smart",
                        "department": "Finance",
                        "location": "Warehouse A"
                    }
                    response_text = f"I've prepared the command:\n* **Command:** CREATE record `{box_barcode.upper()}` / `{file_barcode.upper()}`\n* **Description:** {desc}\n\n⚠️ **Action requires your permission.**"
                    return CopilotChatResponse(
                        response=response_text,
                        actions_suggested=[],
                        pending_action=tool_data,
                        records=None,
                        audit_logs=None
                    )
                else:
                    response_text = "To create a record offline, please use the format:\n`create [box_barcode] [file_barcode] [description]`"
                    return CopilotChatResponse(
                        response=response_text,
                        actions_suggested=[],
                        records=None,
                        audit_logs=None
                    )

            if barcode:
                tool_data = {}
                if cmd == "hold":
                    reason = " ".join(words[2:]) if len(words) > 2 else "Copilot Hold Request"
                    tool_data = {"action": "apply_legal_hold", "barcode": barcode, "reason": reason}
                elif cmd == "unhold":
                    reason = " ".join(words[2:]) if len(words) > 2 else "Copilot Release Request"
                    tool_data = {"action": "remove_legal_hold", "barcode": barcode, "reason": reason}
                elif cmd == "tag":
                    tag = words[2] if len(words) > 2 else ""
                    tool_data = {"action": "add_tag", "barcode": barcode, "tag_name": tag}
                elif cmd == "categorize":
                    category = " ".join(words[2:]) if len(words) > 2 else ""
                    tool_data = {"action": "set_category", "barcode": barcode, "category_name": category}

                if tool_data:
                    response_text = f"I've prepared the command:\n* **Command:** {cmd.upper()} record `{barcode}`\n\n⚠️ **Action requires your permission.**"
                    return CopilotChatResponse(
                        response=response_text,
                        actions_suggested=[],
                        pending_action=tool_data,
                        records=None,
                        audit_logs=None
                    )

        # Offline QA responses
        if "how many records" in msg or "total records" in msg:
            response_text = f"• **Total Active Records:** {context['total_records']}"
            actions.append({"label": "View Records", "route": "/records"})
        elif "hold" in msg:
            response_text = f"• **Active Legal Holds:** {context['holds_count']}\n• Holds block modifications/deletions."
            actions.append({"label": "View Audit Log", "route": "/audit"})
        elif "disposition" in msg or "due" in msg:
            response_text = f"• **Records Due for Disposal:** {context['due_count']}\n• Sweep schedules identify these items."
            actions.append({"label": "Go to Master Data", "route": "/admin/master"})
        elif "search" in msg or "find" in msg:
            term = msg.replace("search for", "").replace("search", "").replace("find", "").strip()
            if term:
                try:
                    search_query = (
                        select(InventoryRecord)
                        .where(
                            InventoryRecord.is_active == True,
                            (InventoryRecord.description.ilike(f"%{term}%")) |
                            (InventoryRecord.box_barcode.ilike(f"%{term}%"))
                        )
                        .limit(3)
                    )
                    search_result = await db.execute(search_query)
                    records = search_result.scalars().all()
                    if records:
                        fetched_records = [
                            {
                                "id": str(r.id),
                                "box_barcode": r.box_barcode,
                                "file_barcode": r.file_barcode,
                                "description": r.description,
                                "entity": r.entity,
                                "department": r.department,
                                "location": r.location,
                                "disposition_status": r.disposition_status,
                                "legal_hold": r.legal_hold,
                                "tags": r.tags
                            }
                            for r in records
                        ]
                        response_text = f"Matches found for **\"{term}\"**:\n"
                        for r in records:
                            response_text += f"• Barcode `{r.box_barcode}`: {r.description[:50]}...\n"
                    else:
                        response_text = f"No matches found for **\"{term}\"**."
                except Exception:
                    response_text = "Database search error."
            else:
                response_text = "Please specify a term: `find [keyword]`."
            actions.append({"label": "View Records", "route": "/records"})
        else:
            response_text = (
                "• Ask about: **record count**, **holds**, **dispositions**, or search via **`find [keyword]`**.\n"
                "• Run local tasks: **`hold [barcode] [reason]`**, **`unhold [barcode]`**, **`tag [barcode] [tag]`**, **`create [box_barcode] [file_barcode] [description]`**."
            )

        logger.info(f"Fallback complete in {time.time() - fallback_start:.4f}s")
        ai_text = response_text

    return CopilotChatResponse(
        response=clean_response(ai_text),
        actions_suggested=actions,
        pending_action=pending_action,
        records=fetched_records,
        audit_logs=fetched_audit_logs
    )

@router.post("/execute", response_model=Dict[str, Any])
async def execute_copilot_action(
    payload: CopilotExecuteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint called when the user confirms execution of a pending tool action.
    """
    logger.info(f"User confirmed execution of action '{payload.action}' via Copilot.")
    if payload.action == "revert_record_version" and current_user.role != "SYSTEM_ADMIN":
        raise HTTPException(status_code=403, detail="Permission Denied: Only SYSTEM_ADMIN role can revert record versions.")

    action_dict = payload.model_dump(exclude_none=True)
    
    try:
        execution_msg = await run_tool_action(db, action_dict, current_user.id)
        logger.info(f"Execution result: {execution_msg}")
        return {"status": "completed", "message": execution_msg}
    except Exception as e:
        logger.error(f"Failed to execute confirmed action: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database execution failed: {str(e)}")
