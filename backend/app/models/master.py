import uuid
from sqlalchemy import Column, String, UUID, ForeignKey, Boolean, Text, DateTime, SmallInteger
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from ..database import Base

class RecordType(Base):
    __tablename__ = "record_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    icon = Column(Text, nullable=True) # e.g. "box", "file", "archive"

    fields = relationship("RecordTypeField", back_populates="record_type", cascade="all, delete-orphan")
    records = relationship("InventoryRecord", back_populates="record_type")

class RecordTypeField(Base):
    __tablename__ = "record_type_fields"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_type_id = Column(UUID(as_uuid=True), ForeignKey("record_types.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False) # Internal key
    label = Column(Text, nullable=False) # Display label
    field_type = Column(Text, nullable=False) # text, textarea, number, date, enum, boolean, user, link
    is_required = Column(Boolean, default=False)
    default_value = Column(Text, nullable=True)
    validation_rules = Column(JSONB, nullable=True) # e.g. {"min": 0, "max": 100, "pattern": "..."}

    record_type = relationship("RecordType", back_populates="fields")

class EntityType(Base):
    __tablename__ = "entity_types"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False, unique=True)
    is_active = Column(Boolean, default=True)

class Entity(Base):
    __tablename__ = "entities"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False, unique=True)
    entity_code = Column(String, nullable=False, unique=True)
    entity_type_id = Column(UUID(as_uuid=True), ForeignKey("entity_types.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)

    entity_type = relationship("EntityType", backref=backref("entities", cascade="all, delete-orphan"))

class Department(Base):
    __tablename__ = "departments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)

class Location(Base):
    __tablename__ = "locations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False, unique=True)
    is_active = Column(Boolean, default=True)

class RetentionPolicy(Base):
    __tablename__ = "retention_policies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    retention_years = Column(SmallInteger, nullable=False, default=7)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Tag(Base):
    __tablename__ = "tags"
    slug = Column(Text, primary_key=True)
    label = Column(Text, nullable=False)
    color = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Category(Base):
    __tablename__ = "categories"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    name = Column(Text, nullable=False)
    path = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    children = relationship("Category", backref=backref('parent', remote_side=[id]))

class AutoClassificationRule(Base):
    __tablename__ = "auto_classification_rules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    # Condition: JSON e.g. {"field": "description", "operator": "contains", "value": "invoice"}
    condition = Column(JSONB, nullable=False)
    # Action: JSON e.g. {"type": "add_tag", "value": "finance"} or {"type": "set_category", "value": "UUID"}
    action = Column(JSONB, nullable=False)
    priority = Column(SmallInteger, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

