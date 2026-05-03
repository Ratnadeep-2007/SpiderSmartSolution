import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class RecordBase(BaseModel):
    record_type_id: Optional[uuid.UUID] = None
    category_id: Optional[uuid.UUID] = None
    entity_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    entity_type_id: Optional[uuid.UUID] = None
    entity: Optional[str] = Field(None, max_length=100)
    entity_code: Optional[str] = Field(None, max_length=10)
    department: Optional[str] = Field(None, max_length=100)
    location: str = Field(..., max_length=16)
    box_barcode: str = Field(..., min_length=5, max_length=50)
    file_barcode: str = Field(..., min_length=5, max_length=50)
    description: str
    record_date: date
    retention_due_date: Optional[date] = None
    custom_fields: Dict[str, Any] = {}
    tags: List[str] = []

class RecordCreate(RecordBase):
    pass

class RecordUpdate(BaseModel):
    record_type_id: Optional[uuid.UUID] = None
    entity_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    entity_type_id: Optional[uuid.UUID] = None
    entity: Optional[str] = None
    entity_code: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    box_barcode: Optional[str] = None
    file_barcode: Optional[str] = None
    description: Optional[str] = None
    record_date: Optional[date] = None
    category_id: Optional[uuid.UUID] = None
    retention_due_date: Optional[date] = None
    disposition_status: Optional[str] = None
    legal_hold: Optional[bool] = None
    is_active: Optional[bool] = None
    custom_fields: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None

class RecordTypeMinimal(BaseModel):
    name: str
    model_config = ConfigDict(from_attributes=True)

class RecordInDB(RecordBase):
    id: uuid.UUID
    version: int
    disposition_status: str
    legal_hold: bool
    is_active: bool
    created_by: Optional[uuid.UUID]
    created_at: datetime
    updated_by: Optional[uuid.UUID]
    updated_at: datetime
    record_type: Optional[RecordTypeMinimal] = None

    model_config = ConfigDict(from_attributes=True)

class RecordVersion(BaseModel):
    id: uuid.UUID
    record_id: uuid.UUID
    version: int
    data_snapshot: Dict[str, Any]
    created_by: Optional[uuid.UUID]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
