import uuid
from sqlalchemy import Column, String, UUID, Text, DateTime, Float, Integer, Boolean
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.sql import func
from ..database import Base


class CompliancePolicy(Base):
    """
    Stores parsed compliance / regulatory documents (retention laws, data
    protection guidelines, tax codes, etc.) as text chunks that can be
    semantically searched via pgvector embeddings.
    """
    __tablename__ = "compliance_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Document metadata
    title = Column(Text, nullable=False)
    source = Column(Text, nullable=True)           # e.g. "UAE Federal Law No. 12"
    jurisdiction = Column(Text, nullable=True)     # e.g. "UAE", "International", "EU"
    category = Column(Text, nullable=True)         # e.g. "Tax", "Data Protection", "Labor"
    applicable_record_types = Column(ARRAY(Text), nullable=True)  # e.g. ["Financial", "HR"]
    retention_years = Column(Integer, nullable=True)               # Suggested retention period
    effective_date = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)          # Short 1-line summary

    # Full policy text (chunked)
    content = Column(Text, nullable=False)         # Full or chunked policy text
    chunk_index = Column(Integer, default=0)       # For multi-chunk docs

    # pgvector embedding (768-dim, same model as records)
    embedding = Column(JSONB, nullable=True)       # Stored as JSON float list

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ComplianceQuery(Base):
    """
    Audit trail of all compliance advisor queries and their AI responses.
    """
    __tablename__ = "compliance_queries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    query_text = Column(Text, nullable=False)
    record_type_hint = Column(Text, nullable=True)    # Optional record type context
    ai_response = Column(Text, nullable=True)
    citations = Column(JSONB, nullable=True)          # List of {title, source, excerpt, retention_years}
    suggested_retention_years = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
