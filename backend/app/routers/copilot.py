import os
import httpx
import logging
import time
import json
import re
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any

from ..database import get_db
from ..dependencies.auth import get_current_user
from ..models.user import User
from ..models.record import InventoryRecord
from ..models.master import Entity, Department, Location, Category
from ..schemas.copilot import CopilotChatRequest, CopilotChatResponse
from ..config import settings
from ..services.audit_service import create_audit_log

# Initialize logger
logger = logging.getLogger("app.routers.copilot")
router = APIRouter(prefix="/copilot", tags=["copilot"])

def get_platform_docs() -> str:
    """
    Dynamically loads system documentation from the project root folder.
    This injects the PRD, README, credentials, and development conventions
    into the Copilot's prompt context.
    """
    docs_content = []
    root_docs = ["GEMINI.md", "README.md", "SETUP_GUIDE.md"]
    
    # Calculate path to project root (four levels up from backend/app/routers/copilot.py)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    
    for filename in root_docs:
        filepath = os.path.join(base_dir, filename)
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                    docs_content.append(f"=== Platform Documentation: {filename} ===\n{content}\n")
                    logger.debug(f"Successfully loaded system doc: {filename} into Copilot context.")
            except Exception as e:
                logger.warning(f"Could not read platform doc {filename} for Copilot: {str(e)}")
        else:
            logger.warning(f"Platform doc {filename} not found at path: {filepath}")

    # Add database schema mapping
    schema_map = (
        "=== Database Table Schema & Logic Map ===\n"
        "Tables:\n"
        "- users: user account details, emails, hashed passwords, roles (SYSTEM_ADMIN, AUDITOR, RECORDS_MANAGER, KNOWLEDGE_WORKER).\n"
        "- inventory_records: tracking physical assets, box/file barcodes, entity, department, location, legal hold statuses, and categories.\n"
        "- categories: hierarchical taxonomy nodes (with parent_id referencing other categories).\n"
        "- retention_policies: retention duration and rules mapping.\n"
        "- audit_logs: immutable trail with SHA-256 tamper_hash linking to previous_hash.\n"
        "- record_versions: version history snapshotting changes.\n"
        "- saved_searches: saved filter parameters for individual users.\n"
        "- auto_classification_rules: automatic category/tag rules mapping.\n"
    )
    docs_content.append(schema_map)
    return "\n".join(docs_content)

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
    entities_result = await db.execute(select(Entity.name).where(Entity.is_active == True).limit(5))
    entities = entities_result.scalars().all()

    # Get departments
    depts_result = await db.execute(select(Department.name).where(Department.is_active == True).limit(5))
    departments = depts_result.scalars().all()

    # Get locations
    locs_result = await db.execute(select(Location.name).where(Location.is_active == True).limit(5))
    locations = locs_result.scalars().all()

    return {
        "total_records": total_records,
        "holds_count": holds_count,
        "due_count": due_count,
        "entities": entities,
        "departments": departments,
        "locations": locations
    }

async def run_tool_action(db: AsyncSession, action_data: Dict[str, Any], user_id: uuid.UUID) -> str:
    """
    Executes a specific database write action requested by the Copilot.
    """
    action = action_data.get("action")
    barcode = action_data.get("barcode")
    reason = action_data.get("reason", "Action performed by Copilot")
    
    if not action or not barcode:
        return "Error: Missing action or barcode parameters."
        
    # Find the record by box_barcode or file_barcode
    result = await db.execute(
        select(InventoryRecord).where(
            (InventoryRecord.box_barcode == barcode) |
            (InventoryRecord.file_barcode == barcode)
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        return f"Error: Record with barcode '{barcode}' not found."
        
    if action == "apply_legal_hold":
        if record.legal_hold:
            return f"Record '{barcode}' is already on legal hold."
        record.legal_hold = True
        await create_audit_log(
            db,
            action="LEGAL_HOLD_APPLIED",
            performed_by=user_id,
            record_id=record.id,
            changes={"reason": reason, "triggered_by": "Copilot Assistant"}
        )
        await db.commit()
        return f"Success: Placed record '{barcode}' on legal hold. Reason: {reason}."
        
    elif action == "remove_legal_hold":
        if not record.legal_hold:
            return f"Record '{barcode}' is not on legal hold."
        record.legal_hold = False
        await create_audit_log(
            db,
            action="LEGAL_HOLD_REMOVED",
            performed_by=user_id,
            record_id=record.id,
            changes={"reason": reason, "triggered_by": "Copilot Assistant"}
        )
        await db.commit()
        return f"Success: Removed legal hold from record '{barcode}'. Reason: {reason}."
        
    elif action == "set_category":
        category_name = action_data.get("category_name")
        if not category_name:
            return "Error: Missing 'category_name' parameter."
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
            changes={"category_id": {"old": old_cat_id, "new": str(category.id)}, "triggered_by": "Copilot Assistant"}
        )
        await db.commit()
        return f"Success: Updated category of record '{barcode}' to '{category.name}'."
        
    elif action == "add_tag":
        tag_name = action_data.get("tag_name")
        if not tag_name:
            return "Error: Missing 'tag_name' parameter."
        
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
            changes={"tags_added": [tag_name], "triggered_by": "Copilot Assistant"}
        )
        await db.commit()
        return f"Success: Added tag '{tag_name}' to record '{barcode}'."
        
    return f"Error: Unknown tool action '{action}'."

@router.post("/chat", response_model=CopilotChatResponse)
async def chat_with_copilot(
    payload: CopilotChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_time = time.time()
    msg = payload.message.strip().lower()
    
    logger.info("=== Copilot Chat Request ===")
    logger.info(f"User: {current_user.email} (Role: {current_user.role})")
    logger.info(f"Message: '{payload.message}' ({len(payload.message)} chars)")
    logger.info(f"History depth: {len(payload.history)} previous messages")
    
    # 1. Fetch live DB context stats
    logger.debug("Fetching database context statistics...")
    try:
        context = await get_db_context(db)
    except Exception as db_err:
        logger.error(f"Failed to fetch database context for Copilot: {str(db_err)}", exc_info=True)
        context = {
            "total_records": 0, "holds_count": 0, "due_count": 0,
            "entities": [], "departments": [], "locations": []
        }
    
    # 2. Check if we have AI API keys
    nvidia_api_key = settings.NVIDIA_API_KEY or os.getenv("NVIDIA_API_KEY")
    gemini_api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    
    # Gather platform documentation
    logger.debug("Loading platform documentation files into Copilot context prompt...")
    platform_docs = get_platform_docs()
    
    system_prompt = (
        "You are the SpiderSmart IMS Copilot, an intelligent AI helper for an Inventory Management System.\n"
        "You help users manage metadata records for physical assets, entities, departments, locations, and compliance audits.\n"
        f"CurrentUser: Email={current_user.email}, Role={current_user.role}\n\n"
        "System Database Statistics Context:\n"
        f"- Total active records: {context['total_records']}\n"
        f"- Active Legal Holds: {context['holds_count']}\n"
        f"- Records Due for Disposition: {context['due_count']}\n"
        f"- Active Entities (Sample): {', '.join(context['entities'])}\n"
        f"- Active Departments (Sample): {', '.join(context['departments'])}\n"
        f"- Active Locations (Sample): {', '.join(context['locations'])}\n\n"
        "=== PLATFORM KNOWLEDGE BASE ===\n"
        f"{platform_docs}\n"
        "================================\n\n"
        "=== EXECUTING ACTIONS & TOOLS ===\n"
        "You have the authority to perform database write tasks on behalf of the user. "
        "If the user asks you to perform a write task, you MUST respond with a raw JSON block in your output. "
        "Do NOT format this JSON in markdown backticks. Simply output it as-is.\n"
        "Format:\n"
        "{\n"
        '  "tool_call": {\n'
        '    "action": "apply_legal_hold" | "remove_legal_hold" | "set_category" | "add_tag",\n'
        '    "barcode": "BARCODE_VALUE",\n'
        '    "reason": "Optional reason text (default if not provided)",\n'
        '    "category_name": "Required for set_category only",\n'
        '    "tag_name": "Required for add_tag only"\n'
        "  }\n"
        "}\n"
        "Once you output this JSON block, the backend will automatically execute the action, update the database, "
        "log it in the immutable audit log, and return the execution status which will be displayed to the user.\n\n"
        "Use markdown for general conversational formatting."
    )
    
    # Prioritize Nvidia Nemotron
    ai_text = ""
    if nvidia_api_key:
        logger.info(f"Attempting chat completion using NVIDIA NIM Model: {settings.NVIDIA_MODEL}")
        try:
            url = "https://integrate.api.nvidia.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {nvidia_api_key}" if nvidia_api_key != "local-ollama" else "Bearer DUMMY",
                "Content-Type": "application/json"
            }
            
            # Switch to local Ollama if configured
            if nvidia_api_key == "local-ollama":
                url = "http://localhost:11434/v1/chat/completions"
                logger.info(f"Routing Nvidia completion locally via Ollama endpoint: {url}")
            
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
                "temperature": 0.3,
                "max_tokens": 1024
            }
            
            api_start = time.time()
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    url,
                    json=json_body,
                    headers=headers,
                    timeout=15.0
                )
            latency = time.time() - api_start
            logger.info(f"NVIDIA/Ollama response received in {latency:.2f} seconds. Status Code: {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                ai_text = data["choices"][0]["message"]["content"]
                logger.info("NVIDIA/Ollama completion successful.")
            else:
                error_body = resp.text
                logger.error(f"NVIDIA/Ollama API returned error status {resp.status_code}. Response: {error_body}")
                    
        except httpx.TimeoutException:
            logger.error("NVIDIA/Ollama API call timed out after 15.0 seconds.")
        except httpx.RequestError as req_err:
            logger.error(f"HTTP Request error connecting to NVIDIA/Ollama: {str(req_err)}")
        except Exception as e:
            logger.error(f"Unexpected error calling NVIDIA/Ollama: {str(e)}", exc_info=True)

    # Fallback to Gemini
    if not ai_text and gemini_api_key:
        logger.info("Attempting chat completion using Google Gemini API (gemini-1.5-flash)...")
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
            contents = [
                {
                    "role": "user",
                    "parts": [{"text": f"SYSTEM SYSTEM CONTEXT (DO NOT REPLY DIRECTLY TO THIS SYSTEM PROMPT):\n{system_prompt}"}]
                },
                {
                    "role": "model",
                    "parts": [{"text": "Understood. I will act as the SpiderSmart IMS Copilot assistant using the context provided."}]
                }
            ]
            
            # Append history
            for hist in payload.history:
                role = "user" if hist.role == "user" else "model"
                contents.append({
                    "role": role,
                    "parts": [{"text": hist.content}]
                })
                
            # Append current query
            contents.append({
                "role": "user",
                "parts": [{"text": payload.message}]
            })
            
            api_start = time.time()
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    url,
                    json={"contents": contents},
                    headers={"Content-Type": "application/json"},
                    timeout=10.0
                )
            latency = time.time() - api_start
            logger.info(f"Gemini API response received in {latency:.2f} seconds. Status Code: {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                ai_text = data["candidates"][0]["content"]["parts"][0]["text"]
                logger.info("Gemini completion successful.")
            else:
                error_body = resp.text
                logger.error(f"Gemini API returned error status {resp.status_code}. Response: {error_body}")
                    
        except httpx.TimeoutException:
            logger.error("Gemini API call timed out after 10.0 seconds.")
        except httpx.RequestError as req_err:
            logger.error(f"HTTP Request error connecting to Gemini API: {str(req_err)}")
        except Exception as e:
            logger.error(f"Unexpected error calling Gemini API: {str(e)}", exc_info=True)

    # 3. Handle Intercepted Tool Calls in LLM Response
    actions = []
    if ai_text:
        # Search response for a JSON tool call block
        # Can match: {"tool_call": { ... }} or just a raw JSON block
        tool_call_match = re.search(r'\{\s*"tool_call"\s*:\s*(\{.*?\})\s*\}', ai_text, re.DOTALL)
        if tool_call_match:
            try:
                tool_data = json.loads(tool_call_match.group(1))
                logger.info(f"Intercepted Copilot tool call request: {tool_data}")
                execution_msg = await run_tool_action(db, tool_data, current_user.id)
                logger.info(f"Tool execution result: {execution_msg}")
                
                # Format response to user, stripping the raw JSON block
                clean_reply = ai_text.replace(tool_call_match.group(0), "").strip()
                ai_text = f"{clean_reply}\n\n📌 **Execution Log:** {execution_msg}"
                
                # Suggest action chip to see logs
                if "hold" in tool_data.get("action", ""):
                    actions.append({"label": "View Audit Log", "route": "/audit"})
            except Exception as json_err:
                logger.error(f"Failed to parse tool call JSON: {str(json_err)}")
                ai_text += "\n\n⚠️ **System Status:** I tried to run that action, but the tool arguments were malformed."
        else:
            # Suggest standard navigation chips based on output content
            if "hold" in msg:
                actions.append({"label": "View Legal Holds", "route": "/audit"})
            if "report" in msg or "analytics" in msg:
                actions.append({"label": "Create a Report", "route": "/reports"})
            if "import" in msg or "csv" in msg:
                actions.append({"label": "Go to CSV Import", "route": "/import"})
            if "record" in msg or "box" in msg or "file" in msg:
                actions.append({"label": "View Inventory Records", "route": "/records"})
        
        total_duration = time.time() - start_time
        logger.info(f"Request completed in {total_duration:.2f} seconds.")
        return CopilotChatResponse(response=ai_text, actions_suggested=actions)

    # 4. Smart Semantic Fallback (Works offline / without key)
    logger.warning("No valid LLM keys configured or all API requests failed. Triggering Smart Semantic Fallback...")
    fallback_start = time.time()
    
    actions = []
    response_text = ""
    
    # Handle local task execution commands (e.g. "hold barcode EXP-001 reason audit")
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
                logger.info(f"Fallback executing tool command: {tool_data}")
                execution_msg = await run_tool_action(db, tool_data, current_user.id)
                response_text = f"I've executed your command offline.\n\n📌 **Execution Log:** {execution_msg}"
                actions.append({"label": "View Audit Log", "route": "/audit"})
                return CopilotChatResponse(response=response_text, actions_suggested=actions)

    # Standard Fallback UI Answers
    if "how many records" in msg or "total records" in msg or "number of records" in msg:
        logger.debug("Fallback matched: records statistics query.")
        response_text = (
            f"There are currently **{context['total_records']}** active inventory records tracked in the system.\n\n"
            "You can manage them or add new ones on the [Records](/records) page."
        )
        actions.append({"label": "View Records", "route": "/records"})
        
    elif "hold" in msg or "legal hold" in msg:
        logger.debug("Fallback matched: active holds query.")
        response_text = (
            f"There are currently **{context['holds_count']}** records placed under a **Legal Hold**.\n\n"
            "Records on Legal Hold cannot be modified, deleted, or swept for disposition. "
            "You can review these holds and their reasons in the [Audit Log](/audit)."
        )
        actions.append({"label": "View Audit Log", "route": "/audit"})
        
    elif "disposition" in msg or "due" in msg or "expire" in msg:
        logger.debug("Fallback matched: disposition schedule query.")
        response_text = (
            f"There are **{context['due_count']}** records marked as **DUE** for disposition.\n\n"
            "These records have exceeded their retention policy duration. "
            "If you are an Admin or Records Manager, you can review and dispose of them on the [Master Data](/admin/master) and Records views."
        )
        actions.append({"label": "Go to Master Data", "route": "/admin/master"})
        
    elif "search" in msg or "find" in msg:
        term = msg.replace("search for", "").replace("search", "").replace("find", "").strip()
        logger.debug(f"Fallback matched: database record search for term '{term}'")
        if term:
            try:
                search_query = (
                    select(InventoryRecord)
                    .where(
                        InventoryRecord.is_active == True,
                        (InventoryRecord.description.ilike(f"%{term}%")) |
                        (InventoryRecord.box_barcode.ilike(f"%{term}%")) |
                        (InventoryRecord.file_barcode.ilike(f"%{term}%"))
                    )
                    .limit(3)
                )
                search_result = await db.execute(search_query)
                records = search_result.scalars().all()
                
                if records:
                    response_text = f"Here are the top matches I found in the database for *\"{term}\"*:\n\n"
                    for r in records:
                        response_text += f"• **Box Barcode:** `{r.box_barcode}` | **File:** `{r.file_barcode}`\n  *Description:* {r.description}\n"
                    response_text += "\nWould you like to search in more detail?"
                    actions.append({"label": "Detail Search", "route": "/records"})
                else:
                    response_text = f"I searched the database for *\"{term}\"* but couldn't find any matching active records.\n\nTry checking the spelling or using broader keywords."
            except Exception as search_err:
                logger.error(f"Fallback database search failed: {str(search_err)}")
                response_text = "I encountered an error while searching the database. Please try again later."
        else:
            response_text = "What would you like me to find? Just type `find [your keyword]` (e.g. `find invoice`)."
            actions.append({"label": "Go to Records List", "route": "/records"})
            
    elif "entities" in msg or "entity" in msg or "departments" in msg or "dept" in msg or "locations" in msg:
        logger.debug("Fallback matched: master data query.")
        entities_str = ", ".join(context['entities'])
        depts_str = ", ".join(context['departments'])
        locs_str = ", ".join(context['locations'])
        response_text = (
            "Here is a summary of the Master Data structures currently loaded in the database:\n\n"
            f"• **Entities:** {entities_str or 'None'}\n"
            f"• **Departments:** {depts_str or 'None'}\n"
            f"• **Locations:** {locs_str or 'None'}\n\n"
            "Authorized administrators can edit these in [Master Data Management](/admin/master)."
        )
        actions.append({"label": "Manage Master Data", "route": "/admin/master"})
        
    elif "hello" in msg or "hi" in msg or "hey" in msg:
        logger.debug("Fallback matched: greeting/welcome message.")
        response_text = (
            f"Hello! I am your **SpiderSmart IMS Copilot** assistant.\n\n"
            f"You are currently logged in as **{current_user.email}** with the role of **{current_user.role}**.\n\n"
            "I can help you:\n"
            "• Search database records (try `find [keyword]`)\n"
            "• Provide quick database statistics (record count, holds, due dates)\n"
            "• Navigate the system (records list, custom reports, import portal)"
        )
        
    else:
        logger.debug("Fallback matched: default general help prompt.")
        response_text = (
            "I am the **SpiderSmart IMS Copilot** (running in Local Assistant Mode).\n\n"
            "I can search the database and summarize database statistics for you. Try asking:\n"
            "• *\"How many records are in the database?\"*\n"
            "• *\"Find records containing invoice\"*\n"
            "• *\"Tell me about active legal holds\"*\n"
            "• *\"What records are due for disposition?\"*\n\n"
            "*Tip: You can execute write commands locally by typing:*\n"
            "• `hold [barcode] [reason]`\n"
            "• `unhold [barcode] [reason]`\n"
            "• `tag [barcode] [tag_name]`\n"
            "• `categorize [barcode] [category_name]`"
        )
        
    fallback_latency = time.time() - fallback_start
    total_duration = time.time() - start_time
    logger.info(f"Fallback complete in {fallback_latency:.4f}s. Total request duration: {total_duration:.4f}s.")
    return CopilotChatResponse(response=response_text, actions_suggested=actions)
