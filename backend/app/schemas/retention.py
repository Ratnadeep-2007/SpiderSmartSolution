import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class RetentionPolicyBase(BaseModel):
    name: str
    description: Optional[str] = None
    retention_years: int = 7
    is_active: bool = True

class RetentionPolicyCreate(RetentionPolicyBase):
    pass

class RetentionPolicy(RetentionPolicyBase):
    id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LegalHoldAction(BaseModel):
    reason: str
