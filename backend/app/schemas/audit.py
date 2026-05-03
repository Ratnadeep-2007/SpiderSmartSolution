import uuid
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: uuid.UUID
    record_id: Optional[uuid.UUID]
    action: str
    performed_by: uuid.UUID
    user_email: Optional[str] = None # For joining with users table
    app_user_id: Optional[str] = None # Custom user ID string
    performed_at: datetime
    ip_address: Optional[str]
    changes: Optional[Dict[str, Any]]
    tamper_hash: str

    class Config:
        from_attributes = True

class AuditVerificationResult(BaseModel):
    is_valid: bool
    total_checked: int
    invalid_log_ids: List[uuid.UUID] = []
