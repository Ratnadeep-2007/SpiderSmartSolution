import uuid
from sqlalchemy import Column, String, UUID, ForeignKey, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from ..database import Base

class ScheduledExport(Base):
    __tablename__ = "scheduled_exports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String(50), nullable=False) # records, audit, custom
    format = Column(String(10), nullable=False) # csv, xlsx, pdf
    schedule_cron = Column(String(50), nullable=False) # e.g. "0 0 * * *"
    email_list = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
