from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import uuid

class ImportMapping(BaseModel):
    # Maps CSV Column Index (or name) to Record Field Name
    # e.g., {"0": "box_barcode", "1": "file_barcode", ...}
    field_map: Dict[str, str]
    # Default values for missing fields (e.g., entity, department)
    defaults: Optional[Dict[str, Any]] = None

class ImportPreviewRequest(BaseModel):
    file_content: str # Base64 encoded or raw string for small files, or we handle Multipart
    mapping: Optional[ImportMapping] = None

class ImportPreviewResponse(BaseModel):
    headers: List[str]
    rows: List[Dict[str, Any]] # Preview of first N rows mapped
    total_rows: int
    validation_errors: List[Dict[str, Any]]

class ImportProcessRequest(BaseModel):
    rows: List[Dict[str, Any]]
    # Or reference a temporary stored file/session
