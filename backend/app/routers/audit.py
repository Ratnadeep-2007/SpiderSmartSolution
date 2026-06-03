import uuid
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import io
import csv

from ..database import get_db
from ..schemas import audit as schemas
from ..services import audit_service
from ..dependencies.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("/", response_model=dict) # Paginated response
async def list_audit_logs(
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    record_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await audit_service.get_audit_logs(
        db, action=action, user_id=user_id, record_id=record_id,
        start_date=start_date, end_date=end_date, page=page, size=size
    )

@router.get("/verify", response_model=schemas.AuditVerificationResult)
async def verify_integrity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await audit_service.verify_audit_chain(db)

@router.get("/export")
async def export_audit_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs_data = await audit_service.get_audit_logs(db, page=1, size=1000) # Get a large batch
    logs = logs_data.get("data", [])
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Timestamp", "Action", "Performed By", "Record ID", "Hash", "Changes"])
    
    for log in logs:
        writer.writerow([
            log.get("id"),
            log["performed_at"].isoformat() if log.get("performed_at") else "",
            log.get("action"),
            log.get("user_email") or log.get("performed_by"),
            log.get("record_id"),
            log.get("tamper_hash"),
            str(log.get("changes"))
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=audit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )
