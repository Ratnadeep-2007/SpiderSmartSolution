import uuid
from typing import List, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from ..database import get_db
from ..schemas.record import RecordCreate, RecordUpdate, RecordInDB, RecordVersion
from ..services import record_service
from ..dependencies.auth import get_current_user, check_role
from ..models.user import User

router = APIRouter()

@router.get("/", response_model=List[RecordInDB])
async def read_records(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Retrieve records.
    """
    return await record_service.get_records(db, skip=skip, limit=limit, current_user=current_user)

@router.post("/", response_model=RecordInDB, status_code=status.HTTP_201_CREATED)
async def create_record(
    *,
    db: AsyncSession = Depends(get_db),
    record_in: RecordCreate,
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER", "KNOWLEDGE_WORKER"]))
) -> Any:
    """
    Create new record.
    """
    try:
        return await record_service.create_record(db, record_in=record_in, user_id=current_user.id)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Box or File Barcode already exists")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/barcode/{code}", response_model=RecordInDB)
async def read_record_by_barcode(
    *,
    db: AsyncSession = Depends(get_db),
    code: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Look up record by Box or File Barcode.
    """
    record = await record_service.get_record_by_barcode(db, barcode=code)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found with this barcode")
    return record

@router.put("/{id}", response_model=RecordInDB)
async def update_record(
    *,
    db: AsyncSession = Depends(get_db),
    id: uuid.UUID,
    record_in: RecordUpdate,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
) -> Any:
    """
    Update a record with optimistic locking support.
    """
    try:
        if_match_dt = None
        if if_match:
            try:
                if_match_dt = datetime.fromisoformat(if_match.replace('Z', '+00:00'))
            except ValueError:
                pass

        record = await record_service.update_record(
            db, record_id=id, record_in=record_in, user_id=current_user.id, if_match=if_match_dt
        )
        if not record:
            raise HTTPException(status_code=404, detail="Record not found")
        return record
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Box or File Barcode already exists")
    except ValueError as e:
        if "CONFLICT" in str(e):
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{id}", response_model=RecordInDB)
async def read_record(
    *,
    db: AsyncSession = Depends(get_db),
    id: uuid.UUID,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get a specific record by ID.
    """
    record = await record_service.get_record(db, record_id=id, current_user=current_user)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@router.get("/{id}/versions", response_model=List[RecordVersion])
async def read_record_versions(
    *,
    db: AsyncSession = Depends(get_db),
    id: uuid.UUID,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get version history for a record.
    """
    return await record_service.get_record_versions(db, record_id=id)

@router.post("/{id}/versions/{version}/revert", response_model=RecordInDB)
async def revert_record(
    *,
    db: AsyncSession = Depends(get_db),
    id: uuid.UUID,
    version: int,
    current_user: User = Depends(check_role(["SYSTEM_ADMIN"]))
) -> Any:
    """
    Revert a record to a specific version.
    """
    record = await record_service.revert_to_version(db, record_id=id, version_num=version, user_id=current_user.id)
    if not record:
        raise HTTPException(status_code=404, detail="Version or record not found")
    return record

@router.delete("/{id}")
async def delete_record(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    """
    Delete a record.
    """
    success = await record_service.delete_record(db, record_id=id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"status": "success"}

