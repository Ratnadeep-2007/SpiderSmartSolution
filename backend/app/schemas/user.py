import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    user_id: Optional[str] = None
    role: str
    is_active: bool = True
    expires_at: Optional[datetime] = None
    scoped_filters: Optional[Dict[str, Any]] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    user_id: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None
    scoped_filters: Optional[Dict[str, Any]] = None

class UserInDB(UserBase):
    id: uuid.UUID
    created_at: datetime
    last_login: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True
