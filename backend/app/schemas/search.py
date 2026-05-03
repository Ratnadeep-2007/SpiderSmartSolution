import uuid
from typing import List, Optional, Any
from pydantic import BaseModel
from .record import RecordInDB

class SavedSearchBase(BaseModel):
    name: str
    query_params: dict

class SavedSearchCreate(SavedSearchBase):
    pass

class SavedSearch(SavedSearchBase):
    id: uuid.UUID
    user_id: uuid.UUID
    
    class Config:
        from_attributes = True

class SearchResult(BaseModel):
    data: List[RecordInDB]
    total: int
    page: int
    size: int
