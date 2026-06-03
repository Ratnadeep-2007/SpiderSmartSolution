from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
import uuid

class RecordTypeFieldBase(BaseModel):
    name: str
    label: str
    field_type: str
    is_required: bool = False
    default_value: Optional[str] = None
    validation_rules: Optional[Dict[str, Any]] = None

class RecordTypeField(RecordTypeFieldBase):
    id: uuid.UUID
    record_type_id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class RecordTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
class RecordType(RecordTypeBase):
    id: uuid.UUID
    fields: List[RecordTypeField]

    model_config = ConfigDict(from_attributes=True)

class EntityTypeBase(BaseModel):
    name: str
    is_active: bool = True

class EntityTypeCreate(EntityTypeBase):
    pass

class EntityType(EntityTypeBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class EntityBase(BaseModel):
    name: str
    entity_code: str = Field(..., pattern=r'^\d{2}$', description="Exactly 2 numeric digits")
    entity_type_id: Optional[uuid.UUID] = None
    is_active: bool = True

class Entity(EntityBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class DepartmentBase(BaseModel):
    entity_id: uuid.UUID
    name: str
    is_active: bool = True

class Department(DepartmentBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class LocationBase(BaseModel):
    name: str
    is_active: bool = True

class Location(LocationBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[uuid.UUID] = None
    path: Optional[str] = None

class Category(CategoryBase):
    id: uuid.UUID
    children: List['Category'] = []
    model_config = ConfigDict(from_attributes=True)

Category.model_rebuild()

class AutoClassificationRuleBase(BaseModel):
    name: str
    condition: Dict[str, Any]
    action: Dict[str, Any]
    priority: int = 0
    is_active: bool = True

class AutoClassificationRuleCreate(AutoClassificationRuleBase):
    apply_retroactive: bool = False

class AutoClassificationRule(AutoClassificationRuleBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class ClassificationDiscovery(BaseModel):
    keyword: str
    count: int

class ClassificationSimulationRequest(BaseModel):
    field: str
    operator: str
    value: str

class ClassificationSimulationResponse(BaseModel):
    total_count: int
    sample_records: List[str]
