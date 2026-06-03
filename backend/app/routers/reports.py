from datetime import date
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..services import report_service, export_service
from ..dependencies.auth import get_current_user
from ..models.user import User
from ..schemas.report import CustomReportRequest

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/by-entity")
async def records_by_entity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await report_service.get_records_by_entity(db)

@router.get("/by-department")
async def records_by_department(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await report_service.get_records_by_department(db)

@router.get("/by-year")
async def records_by_year(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await report_service.get_records_by_year(db)

@router.get("/by-location")
async def records_by_location(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await report_service.get_records_by_location(db)

@router.get("/compliance")
async def retention_compliance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await report_service.get_retention_compliance(db)

@router.get("/upcoming-dispositions")
async def upcoming_dispositions(
    days: int = Query(30, ge=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await report_service.get_upcoming_dispositions(db, days)

@router.get("/user-activity")
async def user_activity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await report_service.get_activity_by_user(db)

@router.get("/active-holds")
async def active_holds(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await report_service.get_active_legal_holds(db)

@router.get("/stats")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await report_service.get_dashboard_stats(db)

@router.post("/custom")
async def custom_report(
    req: CustomReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await report_service.get_custom_report(db, req.columns, req.start_date, req.end_date)


@router.get("/export")
async def export_report(
    report_type: str = Query(...),
    format: str = Query("csv"),
    columns: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    days: int = Query(30, ge=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export specific report data as CSV or PDF.
    """
    # 1. Fetch the data corresponding to report_type
    if report_type == "entity":
        data = await report_service.get_records_by_entity(db)
    elif report_type == "dept":
        data = await report_service.get_records_by_department(db)
    elif report_type == "year":
        data = await report_service.get_records_by_year(db)
    elif report_type == "location":
        data = await report_service.get_records_by_location(db)
    elif report_type == "compliance":
        data = await report_service.get_retention_compliance(db)
    elif report_type == "user":
        data = await report_service.get_activity_by_user(db)
    elif report_type == "upcoming":
        data = await report_service.get_upcoming_dispositions(db, days)
    elif report_type == "holds":
        data = await report_service.get_active_legal_holds(db)
    elif report_type == "custom":
        cols = columns.split(",") if columns else []
        data = await report_service.get_custom_report(db, cols, start_date, end_date)
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

    # 2. Process export through export_service
    custom_cols = columns.split(",") if (columns and report_type == "custom") else None
    buffer, media_type, filename = await export_service.generate_report_export(
        report_type, data, format, custom_cols
    )
    
    return StreamingResponse(
        buffer,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

