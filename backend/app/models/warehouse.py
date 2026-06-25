"""
Warehouse Spatial Routing Models.

Represents the physical layout of storage vaults:
  Warehouse → Zone → Aisle → Shelf → Bin

Each InventoryRecord can be assigned a bin_id for precise spatial location tracking.
"""
import uuid
from sqlalchemy import Column, String, UUID, ForeignKey, Boolean, Integer, Text, Float
from sqlalchemy.orm import relationship, backref
from ..database import Base


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    zones = relationship("WarehouseZone", back_populates="warehouse", cascade="all, delete-orphan")


class WarehouseZone(Base):
    __tablename__ = "warehouse_zones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)  # e.g., "Zone A", "Secure Vault"
    description = Column(Text, nullable=True)

    warehouse = relationship("Warehouse", back_populates="zones")
    aisles = relationship("WarehouseAisle", back_populates="zone", cascade="all, delete-orphan")


class WarehouseAisle(Base):
    __tablename__ = "warehouse_aisles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("warehouse_zones.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(20), nullable=False)  # e.g., "A4", "B2"

    zone = relationship("WarehouseZone", back_populates="aisles")
    shelves = relationship("WarehouseShelf", back_populates="aisle", cascade="all, delete-orphan")


class WarehouseShelf(Base):
    __tablename__ = "warehouse_shelves"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    aisle_id = Column(UUID(as_uuid=True), ForeignKey("warehouse_aisles.id", ondelete="CASCADE"), nullable=False)
    level = Column(Integer, nullable=False)  # Shelf level: 1 = bottom, higher = upper
    max_capacity = Column(Integer, default=100)

    aisle = relationship("WarehouseAisle", back_populates="shelves")
    bins = relationship("WarehouseBin", back_populates="shelf", cascade="all, delete-orphan")


class WarehouseBin(Base):
    __tablename__ = "warehouse_bins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shelf_id = Column(UUID(as_uuid=True), ForeignKey("warehouse_shelves.id", ondelete="CASCADE"), nullable=False)
    bin_code = Column(String(30), nullable=False, unique=True)  # e.g., "A4-S1-B003"
    is_occupied = Column(Boolean, default=False)
    record_id = Column(UUID(as_uuid=True), ForeignKey("inventory_records.id", ondelete="SET NULL"), nullable=True)

    # Coordinates for layout rendering (normalized 0.0–1.0)
    pos_x = Column(Float, nullable=True)
    pos_y = Column(Float, nullable=True)

    shelf = relationship("WarehouseShelf", back_populates="bins")
