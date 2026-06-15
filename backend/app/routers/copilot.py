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
from ..schemas.copilot import CopilotChatRequest, CopilotChatResponse
from ..config import settings
from ..services.audit_service import create_audit_log

# Initialize logger
logger = logging.getLogger("app.routers.copilot")
router = APIRouter(prefix="/copilot", tags=["copilot"])

def get_platform_docs_comprehensive() -> str:
    """
    Returns a highly condensed yet comprehensive system guide.
    Explains all features so the Copilot can guide users on every capability.
    """
    return (
        "=== COMPREHENSIVE PLATFORM BLUEPRINT ===\n"
        "1. USER ACCOUNTS & SECURITY:\n"
        "   - Default Admin: admin@spidersmart.com / admin123\n"
        "   - Roles: SYSTEM_ADMIN (full access), RECORDS_MANAGER (CRUD records/master data), AUDITOR (read-only audit trail), KNOWLEDGE_WORKER (CRUD records).\n"
        "2. INVENTORY REGISTRY & RECORDS:\n"
        "   - Tracks physical assets (Box Barcode & File Barcode required, must be unique).\n"
        "   - Dynamic Fields: Schema-based record types (Physical Box, Individual File, Digital Media) support custom metadata fields.\n"
        "   - Actions: Users can search, create, edit, or delete records. Deleting a record updates the Point-in-Time version table.\n"
        "3. RETENTION & LEGAL HOLDS:\n"
        "   - Retention policies (e.g. 7 years) auto-calculate expiration dates. Sweeps flag records past due as 'DUE'.\n"
        "   - Legal Hold blocks modifications/deletions and halts the disposition sweep. Logged as LEGAL_HOLD_APPLIED/REMOVED.\n"
        "   - Disposal: Admin/Records Manager can 'Dispose' records marked DUE (active status -> false, disposition -> DISPOSED).\n"
        "4. AUDIT TRAIL:\n"
        "   - Immutable log chain using SHA-256 where each log links to the previous_hash and generates a new tamper_hash.\n"
        "5. REPORTING & BULK IMPORT:\n"
        "   - Import: Upload CSV sheets mapped to DB headers at `/import`.\n"
        "   - Reports: Custom report builder at `/reports` outputs PDF/Excel sheets and triggers background cron exports.\n"
        "6. ROUTES MAP:\n"
        "   - `/records` (Inventory list) | `/audit` (Audit & Holds) | `/reports` (Reports) | `/import` (CSV Upload)\n"
        "   - `/admin/users` (Users panel) | `/admin/master` (Locations/Entities CRUD) | `/admin/classification` (Auto-classify rules)"
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
    
    system_prompt = (
        "You are the SpiderSmart IMS Copilot, an AI assistant for an Inventory Management System.\n"
        f"User: {current_user.email} ({current_user.role})\n\n"
        "DB STATS:\n"
        f"- Active records: {context['total_records']} | Holds: {context['holds_count']} | Due: {context['due_count']}\n"
        f"- Entities (sample): {', '.join(context['entities'])} | Depts (sample): {', '.join(context['departments'])}\n\n"
        f"{platform_docs}\n\n"
        "=== EXECUTING ACTIONS ===\n"
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
        '    "location": "Location name",\n'
        '    "location_name": "Name for new location CRUD",\n'
        '    "category_name": "Name for new category CRUD"\n'
        "  }\n"
        "}\n\n"
        "=== OUTPUT STYLE RULES (CRITICAL) ===\n"
        "- Be extremely concise. Avoid greetings, pleasantries, or chatty filler text (e.g. 'Hello', 'How can I help you today?').\n"
        "- Format answers in clean, bold bullet points.\n"
        "- Do not explain actions if executing a tool call. Just output the JSON block."
    )
    
    # Prioritize Nvidia Nemotron
    ai_text = ""
    if nvidia_api_key:
        try:
            url = "https://integrate.api.nvidia.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {nvidia_api_key}" if nvidia_api_key != "local-ollama" else "Bearer DUMMY",
                "Content-Type": "application/json"
            }
            if nvidia_api_key == "local-ollama":
                url = "http://localhost:11434/v1/chat/completions"
            
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            for hist in payload.history:
                role = "user" if hist.role == "user" else "assistant"
                messages.append({"role": role, "content": hist.content})
            messages.append({"role": "user", "content": payload.message})

            json_body = {
                "model": settings.NVIDIA_MODEL,
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 512
            }
            
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=json_body, headers=headers, timeout=12.0)
            if resp.status_code == 200:
                ai_text = resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Nvidia NIM API call failed: {str(e)}")

    # Fallback to Gemini
    if not ai_text and gemini_api_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
            contents = [
                {"role": "user", "parts": [{"text": f"SYSTEM CONTEXT:\n{system_prompt}"}]},
                {"role": "model", "parts": [{"text": "Understood. I will respond concisely and output raw tool JSONs directly."}]}
            ]
            for hist in payload.history:
                role = "user" if hist.role == "user" else "model"
                contents.append({"role": role, "parts": [{"text": hist.content}]})
            contents.append({"role": "user", "parts": [{"text": payload.message}]})
            
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json={"contents": contents}, headers={"Content-Type": "application/json"}, timeout=10.0)
            if resp.status_code == 200:
                ai_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.error(f"Gemini API call failed: {str(e)}")

    # Handle Intercepted Tool Calls in LLM Response
    actions = []
    if ai_text:
        # Match JSON block
        tool_call_match = re.search(r'\{\s*"tool_call"\s*:\s*(\{.*?\})\s*\}', ai_text, re.DOTALL)
        if tool_call_match:
            try:
                tool_data = json.loads(tool_call_match.group(1))
                execution_msg = await run_tool_action(db, tool_data, current_user.id)
                clean_reply = ai_text.replace(tool_call_match.group(0), "").strip()
                
                ai_text = clean_reply if clean_reply else "Tool action requested."
                ai_text += f"\n\n📌 **Execution:** {execution_msg}"
                
                if "hold" in tool_data.get("action", ""):
                    actions.append({"label": "View Audit Log", "route": "/audit"})
            except Exception as json_err:
                logger.error(f"Tool parse failed: {str(json_err)}")
                ai_text += "\n\n⚠️ **System Status:** Tool arguments malformed."
        else:
            # Clean conversational output: remove backticks if model generated any JSON in them
            ai_text = re.sub(r'```json.*?```', '', ai_text, flags=re.DOTALL).strip()
            
            # Suggest navigation chips
            if "hold" in msg:
                actions.append({"label": "View Legal Holds", "route": "/audit"})
            if "report" in msg:
                actions.append({"label": "Create a Report", "route": "/reports"})
            if "import" in msg:
                actions.append({"label": "Go to CSV Import", "route": "/import"})
            if "record" in msg or "search" in msg:
                actions.append({"label": "View Records", "route": "/records"})
        
        logger.info(f"Copilot Request Completed in {time.time() - start_time:.2f}s")
        return CopilotChatResponse(response=ai_text, actions_suggested=actions)

    # 5. Smart Semantic Fallback (Offline Mode)
    fallback_start = time.time()
    response_text = ""
    
    # Offline Command Execution
    if msg.startswith("hold ") or msg.startswith("unhold ") or msg.startswith("tag ") or msg.startswith("categorize "):
        words = msg.split()
        cmd = words[0]
        barcode = words[1] if len(words) > 1 else ""
        
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
                execution_msg = await run_tool_action(db, tool_data, current_user.id)
                response_text = f"📌 **Execution:** {execution_msg}"
                actions.append({"label": "View Audit Log", "route": "/audit"})
                return CopilotChatResponse(response=response_text, actions_suggested=actions)

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
            "• Run local tasks: **`hold [barcode] [reason]`**, **`unhold [barcode]`**, **`tag [barcode] [tag]`**."
        )
        
    logger.info(f"Fallback complete. Total duration: {time.time() - start_time:.4f}s")
    return CopilotChatResponse(response=response_text, actions_suggested=actions)
