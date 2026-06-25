"""
Warehouse Spatial Routing Service.

Provides:
- CRUD for warehouse layout (warehouses, zones, aisles, shelves, bins)
- Layout optimization: recommend optimal bin for a new box based on
  department proximity (cluster similar departments together) and
  minimize retrieval travel distance (pick bins closest to entry point)
"""
import uuid
import math
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from ..models.warehouse import Warehouse, WarehouseZone, WarehouseAisle, WarehouseShelf, WarehouseBin
from ..models.record import InventoryRecord


# ---------------------------------------------------------------------------
# Warehouse CRUD
# ---------------------------------------------------------------------------

async def list_warehouses(db: AsyncSession) -> List[Warehouse]:
    result = await db.execute(
        select(Warehouse)
        .options(
            selectinload(Warehouse.zones)
            .selectinload(WarehouseZone.aisles)
            .selectinload(WarehouseAisle.shelves)
            .selectinload(WarehouseShelf.bins)
        )
        .where(Warehouse.is_active == True)
    )
    return result.scalars().all()


async def get_warehouse(db: AsyncSession, warehouse_id: uuid.UUID) -> Optional[Warehouse]:
    result = await db.execute(
        select(Warehouse)
        .options(
            selectinload(Warehouse.zones)
            .selectinload(WarehouseZone.aisles)
            .selectinload(WarehouseAisle.shelves)
            .selectinload(WarehouseShelf.bins)
        )
        .where(Warehouse.id == warehouse_id)
    )
    return result.scalar_one_or_none()


async def create_warehouse(db: AsyncSession, name: str, address: Optional[str] = None) -> Warehouse:
    wh = Warehouse(name=name, address=address)
    db.add(wh)
    await db.commit()
    await db.refresh(wh)
    return wh


async def create_zone(db: AsyncSession, warehouse_id: uuid.UUID, name: str, description: Optional[str] = None) -> WarehouseZone:
    zone = WarehouseZone(warehouse_id=warehouse_id, name=name, description=description)
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return zone


async def create_aisle(db: AsyncSession, zone_id: uuid.UUID, label: str) -> WarehouseAisle:
    aisle = WarehouseAisle(zone_id=zone_id, label=label)
    db.add(aisle)
    await db.commit()
    await db.refresh(aisle)
    return aisle


async def create_shelf(db: AsyncSession, aisle_id: uuid.UUID, level: int, max_capacity: int = 100) -> WarehouseShelf:
    shelf = WarehouseShelf(aisle_id=aisle_id, level=level, max_capacity=max_capacity)
    db.add(shelf)
    await db.commit()
    await db.refresh(shelf)
    return shelf


async def create_bin(
    db: AsyncSession,
    shelf_id: uuid.UUID,
    bin_code: str,
    pos_x: Optional[float] = None,
    pos_y: Optional[float] = None
) -> WarehouseBin:
    wbin = WarehouseBin(shelf_id=shelf_id, bin_code=bin_code, pos_x=pos_x, pos_y=pos_y)
    db.add(wbin)
    await db.commit()
    await db.refresh(wbin)
    return wbin


async def assign_record_to_bin(
    db: AsyncSession,
    bin_id: uuid.UUID,
    record_id: uuid.UUID
) -> WarehouseBin:
    result = await db.execute(select(WarehouseBin).where(WarehouseBin.id == bin_id))
    wbin = result.scalar_one_or_none()
    if not wbin:
        raise ValueError("Bin not found")
    if wbin.is_occupied and wbin.record_id != record_id:
        raise ValueError("Bin is already occupied")
    wbin.record_id = record_id
    wbin.is_occupied = True
    await db.commit()
    await db.refresh(wbin)
    return wbin


async def unassign_bin(db: AsyncSession, bin_id: uuid.UUID) -> WarehouseBin:
    result = await db.execute(select(WarehouseBin).where(WarehouseBin.id == bin_id))
    wbin = result.scalar_one_or_none()
    if not wbin:
        raise ValueError("Bin not found")
    wbin.record_id = None
    wbin.is_occupied = False
    await db.commit()
    await db.refresh(wbin)
    return wbin


# ---------------------------------------------------------------------------
# Layout Optimization Algorithm
# ---------------------------------------------------------------------------

def _euclidean_distance(x1: Optional[float], y1: Optional[float], x2: float, y2: float) -> float:
    """Calculate Euclidean distance; treat None coords as far distance."""
    if x1 is None or y1 is None:
        return 999.0
    return math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)


async def recommend_bin(
    db: AsyncSession,
    department: str,
    entry_point_x: float = 0.0,
    entry_point_y: float = 0.0
) -> Dict[str, Any]:
    """
    Recommend the optimal bin for storing a new record by:
    1. Finding bins occupied by the same department (clustering)
    2. Among candidate bins, picking the one closest to the entry point
    3. If no same-department bins exist, return the nearest empty bin to entry
    """
    # Find all empty bins
    empty_result = await db.execute(
        select(WarehouseBin)
        .options(
            selectinload(WarehouseBin.shelf)
            .selectinload(WarehouseShelf.aisle)
            .selectinload(WarehouseAisle.zone)
            .selectinload(WarehouseZone.warehouse)
        )
        .where(WarehouseBin.is_occupied == False)
    )
    empty_bins: List[WarehouseBin] = empty_result.scalars().all()

    if not empty_bins:
        return {"recommendation": None, "reason": "No empty bins available"}

    # Find records from the same department that are already assigned to bins
    dept_bins_result = await db.execute(
        select(WarehouseBin.bin_code, WarehouseBin.pos_x, WarehouseBin.pos_y)
        .join(InventoryRecord, WarehouseBin.record_id == InventoryRecord.id)
        .where(InventoryRecord.department == department)
    )
    dept_bins = dept_bins_result.all()

    scored_bins = []

    for wbin in empty_bins:
        dist_to_entry = _euclidean_distance(wbin.pos_x, wbin.pos_y, entry_point_x, entry_point_y)

        # Department clustering bonus: if near a same-dept bin, lower score
        dept_proximity = 0.0
        if dept_bins:
            min_dept_dist = min(
                _euclidean_distance(wbin.pos_x, wbin.pos_y, b.pos_x or 0.5, b.pos_y or 0.5)
                for b in dept_bins
            )
            dept_proximity = min_dept_dist * 0.5  # Weight dept clustering at 50%

        # Final score: lower is better
        score = dist_to_entry + dept_proximity

        scored_bins.append({
            "bin_id": str(wbin.id),
            "bin_code": wbin.bin_code,
            "score": round(score, 4),
            "distance_to_entry": round(dist_to_entry, 4),
            "department_proximity": round(dept_proximity, 4),
            "pos_x": wbin.pos_x,
            "pos_y": wbin.pos_y,
            "location": _bin_location_path(wbin)
        })

    scored_bins.sort(key=lambda b: b["score"])
    top = scored_bins[0] if scored_bins else None

    return {
        "recommendation": top,
        "alternatives": scored_bins[1:5],  # Top 5 alternatives
        "department": department,
        "reason": f"Optimal bin minimizing travel distance and department clustering for '{department}'"
    }


def _bin_location_path(wbin: WarehouseBin) -> str:
    """Build a human-readable location path: Warehouse > Zone > Aisle > Shelf > Bin"""
    try:
        shelf = wbin.shelf
        aisle = shelf.aisle
        zone = aisle.zone
        warehouse = zone.warehouse
        return f"{warehouse.name} > {zone.name} > Aisle {aisle.label} > Shelf L{shelf.level} > {wbin.bin_code}"
    except Exception:
        return wbin.bin_code


async def get_warehouse_stats(db: AsyncSession, warehouse_id: uuid.UUID) -> Dict[str, Any]:
    """Return occupancy statistics for a warehouse."""
    wh = await get_warehouse(db, warehouse_id)
    if not wh:
        return {}

    total_bins = 0
    occupied_bins = 0
    for zone in wh.zones:
        for aisle in zone.aisles:
            for shelf in aisle.shelves:
                for wbin in shelf.bins:
                    total_bins += 1
                    if wbin.is_occupied:
                        occupied_bins += 1

    return {
        "warehouse_id": str(warehouse_id),
        "warehouse_name": wh.name,
        "total_bins": total_bins,
        "occupied_bins": occupied_bins,
        "empty_bins": total_bins - occupied_bins,
        "occupancy_rate": round(occupied_bins / total_bins * 100, 1) if total_bins else 0
    }
