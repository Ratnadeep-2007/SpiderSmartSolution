from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import json
from typing import Dict, Any, Annotated
from ..database import get_db
from ..services import import_service
from ..dependencies.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/import", tags=["import"])

@router.post("/preview")
async def preview_import(
    file: Annotated[UploadFile, File()],
    current_user: Annotated[User, Depends(get_current_user)]
):
    is_xlsx = file.filename.endswith('.xlsx')
    if not (file.filename.endswith('.csv') or is_xlsx):
        raise HTTPException(status_code=400, detail="Only CSV and XLSX files are supported")
    
    content = await file.read()
    
    if is_xlsx:
        headers, rows = await import_service.parse_xlsx_preview(content)
    else:
        try:
            decoded_content = content.decode('utf-8')
        except UnicodeDecodeError:
            # Fallback for some CSVs with special characters
            decoded_content = content.decode('latin-1')
        headers, rows = await import_service.parse_csv_preview(decoded_content)
    
    return {
        "headers": headers,
        "preview_rows": rows,
        "filename": file.filename,
        "is_xlsx": is_xlsx
    }

@router.post("/process")
async def process_import(
    file: Annotated[UploadFile, File()],
    field_map: Annotated[str, Form()],
    defaults: Annotated[str, Form()],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    is_xlsx = file.filename.endswith('.xlsx')
    try:
        parsed_field_map = json.loads(field_map)
        parsed_defaults = json.loads(defaults)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid mapping or defaults format")

    content = await file.read()
    
    if is_xlsx:
        result = await import_service.process_import(
            db, "", parsed_field_map, parsed_defaults, current_user.id, is_xlsx=True, file_bytes=content
        )
    else:
        try:
            decoded_content = content.decode('utf-8')
        except UnicodeDecodeError:
            decoded_content = content.decode('latin-1')
        result = await import_service.process_import(
            db, decoded_content, parsed_field_map, parsed_defaults, current_user.id
        )
    return result
