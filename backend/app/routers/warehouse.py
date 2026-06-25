"""
Warehouse Spatial Routing Router.

Endpoints:
- GET  /warehouse/                              - List warehouses
- POST /warehouse/                              - Create warehouse
- GET  /warehouse/{id}                          - Get warehouse with full layout tree
- GET  /warehouse/{id}/stats                    - Occupancy statistics
- POST /warehouse/{id}/zones                    - Add zone
- POST /warehouse/zones/{zone_id}/aisles        - Add aisle to zone
- POST /warehouse/aisles/{aisle_id}/shelves     - Add shelf to aisle
- POST /warehouse/shelves/{shelf_id}/bins       - Add bin to shelf
- POST /warehouse/bins/{bin_id}/assign          - Assign record to bin
- DELETE /warehouse/bins/{bin_id}/assign        - Unassign bin
- GET  /warehouse/recommend                     - Recommend optimal bin for a department
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..services import warehouse_service
from ..dependencies.auth import get_current_user, check_role
from ..models.user import User

router = APIRouter(prefix="/warehouse", tags=["warehouse"])


class WarehouseCreate(BaseModel):
    name: str
    address: Optional[str] = None

class ZoneCreate(BaseModel):
    name: str
    description: Optional[str] = None

class AisleCreate(BaseModel):
    label: str

class ShelfCreate(BaseModel):
    level: int
    max_capacity: int = 100

class BinCreate(BaseModel):
    bin_code: str
    pos_x: Optional[float] = None
    pos_y: Optional[float] = None

class AssignRequest(BaseModel):
    record_id: uuid.UUID


@router.get("/")
async def list_warehouses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    warehouses = await warehouse_service.list_warehouses(db)
    # Serialize to dicts to avoid lazy-load issues
    return [_serialize_warehouse(w) for w in warehouses]


@router.post("/")
async def create_warehouse(
    body: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    wh = await warehouse_service.create_warehouse(db, body.name, body.address)
    return {"id": str(wh.id), "name": wh.name, "address": wh.address}


@router.get("/recommend")
async def recommend_bin(
    department: str = Query(...),
    entry_x: float = Query(0.0),
    entry_y: float = Query(0.0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recommend the optimal empty bin for a given department."""
    result = await warehouse_service.recommend_bin(db, department, entry_x, entry_y)
    return result


@router.get("/{warehouse_id}")
async def get_warehouse(
    warehouse_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    wh = await warehouse_service.get_warehouse(db, warehouse_id)
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return _serialize_warehouse(wh)


@router.get("/{warehouse_id}/stats")
async def warehouse_stats(
    warehouse_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await warehouse_service.get_warehouse_stats(db, warehouse_id)


@router.post("/{warehouse_id}/zones")
async def add_zone(
    warehouse_id: uuid.UUID,
    body: ZoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    zone = await warehouse_service.create_zone(db, warehouse_id, body.name, body.description)
    return {"id": str(zone.id), "name": zone.name}


@router.post("/zones/{zone_id}/aisles")
async def add_aisle(
    zone_id: uuid.UUID,
    body: AisleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    aisle = await warehouse_service.create_aisle(db, zone_id, body.label)
    return {"id": str(aisle.id), "label": aisle.label}


@router.post("/aisles/{aisle_id}/shelves")
async def add_shelf(
    aisle_id: uuid.UUID,
    body: ShelfCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    shelf = await warehouse_service.create_shelf(db, aisle_id, body.level, body.max_capacity)
    return {"id": str(shelf.id), "level": shelf.level}


@router.post("/shelves/{shelf_id}/bins")
async def add_bin(
    shelf_id: uuid.UUID,
    body: BinCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    wbin = await warehouse_service.create_bin(db, shelf_id, body.bin_code, body.pos_x, body.pos_y)
    return {"id": str(wbin.id), "bin_code": wbin.bin_code}


@router.post("/bins/{bin_id}/assign")
async def assign_bin(
    bin_id: uuid.UUID,
    body: AssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    try:
        wbin = await warehouse_service.assign_record_to_bin(db, bin_id, body.record_id)
        return {"id": str(wbin.id), "bin_code": wbin.bin_code, "record_id": str(wbin.record_id)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/bins/{bin_id}/assign")
async def unassign_bin(
    bin_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    try:
        wbin = await warehouse_service.unassign_bin(db, bin_id)
        return {"id": str(wbin.id), "bin_code": wbin.bin_code, "is_occupied": wbin.is_occupied}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Serialization helpers (avoid lazy-load issues with async SQLAlchemy)
# ---------------------------------------------------------------------------

def _serialize_bin(b) -> dict:
    return {
        "id": str(b.id),
        "bin_code": b.bin_code,
        "is_occupied": b.is_occupied,
        "record_id": str(b.record_id) if b.record_id else None,
        "pos_x": b.pos_x,
        "pos_y": b.pos_y
    }

def _serialize_shelf(s) -> dict:
    return {
        "id": str(s.id),
        "level": s.level,
        "max_capacity": s.max_capacity,
        "bins": [_serialize_bin(b) for b in s.bins]
    }

def _serialize_aisle(a) -> dict:
    return {
        "id": str(a.id),
        "label": a.label,
        "shelves": [_serialize_shelf(s) for s in a.shelves]
    }

def _serialize_zone(z) -> dict:
    return {
        "id": str(z.id),
        "name": z.name,
        "description": z.description,
        "aisles": [_serialize_aisle(a) for a in z.aisles]
    }

def _serialize_warehouse(w) -> dict:
    return {
        "id": str(w.id),
        "name": w.name,
        "address": w.address,
        "is_active": w.is_active,
        "zones": [_serialize_zone(z) for z in w.zones]
    }
