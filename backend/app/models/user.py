import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum, UUID
from sqlalchemy.sql import func
from ..database import Base

from sqlalchemy.dialects.postgresql import JSONB

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # SYSTEM_ADMIN, RECORDS_MANAGER, KNOWLEDGE_WORKER, AUDITOR, EXTERNAL_GUEST
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Specifically for EXTERNAL_GUEST
    # Filter for Guests: e.g. {"entity": "Spider Smart"}
    scoped_filters = Column(JSONB, nullable=True)
