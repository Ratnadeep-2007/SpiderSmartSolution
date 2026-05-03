import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class ScheduledExportBase(BaseModel):
    report_type: str
    format: str
    schedule_cron: str
    email_list: List[str] = []
    is_active: bool = True

class ScheduledExportCreate(ScheduledExportBase):
    pass

class ScheduledExportUpdate(BaseModel):
    report_type: Optional[str] = None
    format: Optional[str] = None
    schedule_cron: Optional[str] = None
    email_list: Optional[List[str]] = None
    is_active: Optional[bool] = None

class ScheduledExport(ScheduledExportBase):
    id: uuid.UUID
    user_id: uuid.UUID
    last_run_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
