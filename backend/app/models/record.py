import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, UUID, JSON, ForeignKey, Boolean, SmallInteger, CHAR, ARRAY, Date, Index, Computed, Text
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from ..database import Base

class InventoryRecord(Base):
    __tablename__ = "inventory_records"

    # System Fields
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_type_id = Column(UUID(as_uuid=True), ForeignKey("record_types.id"), index=True)
    
    # Core Required Fields (Section 5.1 PRD)
    entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id"), index=True, nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), index=True, nullable=True)
    entity_type_id = Column(UUID(as_uuid=True), ForeignKey("entity_types.id"), index=True, nullable=True)
    
    # Cached string values for search and performance
    entity = Column(String(100), nullable=False)
    entity_code = Column(String(10), nullable=False) # Supporting numeric (10-99) and alphabetic (EXP, GOO)
    department = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=True)
    location = Column(String(100), nullable=False)
    box_barcode = Column(String(50), unique=True, index=True, nullable=False)
    file_barcode = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String, nullable=False)
    record_date = Column(Date, nullable=False)
    
    # Extended Fields
    version = Column(Integer, default=1)
    tags = Column(ARRAY(String), default=[])
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), index=True, nullable=True)
    
    # Retention & Disposition
    retention_policy_id = Column(UUID(as_uuid=True), index=True, nullable=True)
    retention_due_date = Column(Date, nullable=True)
    disposition_status = Column(String, default="ACTIVE") # ACTIVE, DUE, DISPOSED, LEGAL_HOLD
    
    # Legal Hold
    legal_hold = Column(Boolean, default=False)
    
    is_active = Column(Boolean, default=True)
    
    # Custom Fields Store
    custom_fields = Column(JSON, default={})
    
    # Vector Embeddings for Semantic Search
    embedding = Column(Vector(3072), nullable=True)
    
    # Metadata
    created_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_by = Column(UUID(as_uuid=True))
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Search Vector (Computed Column)
    search_vector = Column(TSVECTOR, Computed(
        "to_tsvector('english', coalesce(description, '') || ' ' || "
        "coalesce(entity, '') || ' ' || "
        "coalesce(department, '') || ' ' || "
        "coalesce(entity_type, '') || ' ' || "
        "coalesce(location, '') || ' ' || "
        "coalesce(box_barcode, '') || ' ' || "
        "coalesce(file_barcode, ''))",
        persisted=True
    ))

    # Relationships
    record_type = relationship("RecordType", back_populates="records")
    category = relationship("Category")
    entity_rel = relationship("Entity")
    department_rel = relationship("Department")
    entity_type_rel = relationship("EntityType")
    versions = relationship("RecordVersion", back_populates="record", cascade="all, delete-orphan")

Index('ix_inventory_records_search_vector', InventoryRecord.search_vector, postgresql_using='gin')

class RecordVersion(Base):
    __tablename__ = "record_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("inventory_records.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)
    data_snapshot = Column(JSON, nullable=False)
    
    created_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    record = relationship("InventoryRecord", back_populates="versions")

class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    query_params = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
