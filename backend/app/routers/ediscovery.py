import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..services import ediscovery_service
from ..dependencies.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/ediscovery", tags=["ediscovery"])

@router.post("/export-zip")
async def export_zip(
    record_ids: List[uuid.UUID] = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export selected records to a cryptographic-ready ZIP for eDiscovery.
    """
    if not record_ids:
        raise HTTPException(status_code=400, detail="No records selected")
        
    zip_buffer = await ediscovery_service.generate_ediscovery_zip(db, record_ids)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/x-zip-compressed",
        headers={"Content-Disposition": f"attachment; filename=ediscovery_export_{uuid.uuid4().hex[:8]}.zip"}
    )
