import uuid
from sqlalchemy import Column, String, DateTime, UUID, JSON, func
from ..database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), nullable=True)
    action = Column(String, nullable=False)
    performed_by = Column(UUID(as_uuid=True), nullable=False)
    performed_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String, nullable=True)
    changes = Column(JSON, nullable=True)
    tamper_hash = Column(String, nullable=False)
