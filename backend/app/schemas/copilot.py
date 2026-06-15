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
