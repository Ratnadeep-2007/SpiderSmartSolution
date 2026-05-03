from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from ..database import get_db
from ..services import report_service
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
