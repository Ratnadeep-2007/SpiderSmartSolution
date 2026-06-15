from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class CopilotChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

class CopilotChatResponse(BaseModel):
    response: str
    actions_suggested: Optional[List[Dict[str, Any]]] = []
    pending_action: Optional[Dict[str, Any]] = None

class CopilotExecuteRequest(BaseModel):
    action: str
    barcode: Optional[str] = None
    reason: Optional[str] = None
    category_name: Optional[str] = None
    tag_name: Optional[str] = None
    box_barcode: Optional[str] = None
    file_barcode: Optional[str] = None
    description: Optional[str] = None
    record_date: Optional[str] = None
    entity: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    location_name: Optional[str] = None
