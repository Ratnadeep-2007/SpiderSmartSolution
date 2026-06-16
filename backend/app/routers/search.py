import uuid
import csv
import io
from datetime import date
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas import search as schemas
from ..services import search_service, export_service
from ..dependencies.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/", response_model=schemas.SearchResult)
async def perform_search(
    q: Optional[str] = None,
    entity: Optional[str] = None,
    entity_id: Optional[uuid.UUID] = None,
    department: Optional[str] = None,
    department_id: Optional[uuid.UUID] = None,
    entity_type_id: Optional[uuid.UUID] = None,
    location: Optional[str] = None,
    record_date: Optional[date] = None,
    record_type_id: Optional[uuid.UUID] = None,
    category_id: Optional[uuid.UUID] = None,
    disposition_status: Optional[str] = None,
    tags: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    semantic: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await search_service.search_records(
        db, q=q, entity=entity, entity_id=entity_id, 
        department=department, department_id=department_id,
        entity_type_id=entity_type_id,
        location=location, 
        record_date=record_date, record_type_id=record_type_id, category_id=category_id,
        disposition_status=disposition_status, tags=tags,
        page=page, size=size, current_user=current_user,
        semantic=semantic
    )

@router.get("/export")
async def export_search_results(
    q: Optional[str] = None,
    entity: Optional[str] = None,
    department: Optional[str] = None,
    format: str = "csv",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export search results as CSV or PDF.
    """
    search_res = await search_service.search_records(
        db, q=q, entity=entity, department=department, size=1000, current_user=current_user
    )
    
    if format == "pdf":
        record_ids = [r.id for r in search_res["data"]]
        pdf_buffer = await export_service.generate_records_pdf(db, record_ids)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=search_results.pdf"}
        )
    
    if format == "xlsx":
        record_ids = [r.id for r in search_res["data"]]
        xlsx_buffer = await export_service.generate_records_xlsx(db, record_ids)
        return StreamingResponse(
            xlsx_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=search_results.xlsx"}
        )
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Box Barcode", "File Barcode", "Entity", "Department", "Date", "Status"])
    for r in search_res["data"]:
        writer.writerow([r.box_barcode, r.file_barcode, r.entity, r.department, r.record_date, r.disposition_status])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=search_results.csv"}
    )

@router.get("/saved", response_model=List[schemas.SavedSearch])
async def list_saved_searches(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await search_service.get_saved_searches(db, user_id=current_user.id)

@router.post("/saved", response_model=schemas.SavedSearch)
async def save_search(
    search_in: schemas.SavedSearchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await search_service.create_saved_search(
        db, user_id=current_user.id, name=search_in.name, query_params=search_in.query_params
    )

@router.delete("/saved/{id}")
async def remove_saved_search(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = await search_service.delete_saved_search(db, search_id=id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Saved search not found")
    return {"status": "success"}
