import io
import zipfile
import csv
import json
import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from ..models.record import InventoryRecord

async def generate_ediscovery_zip(db: AsyncSession, record_ids: List[uuid.UUID]) -> io.BytesIO:
    """
    Generates a ZIP file containing:
    1. inventory_metadata.csv (Master list)
    2. individual_records/ (Folder with JSON for each record)
    """
    # 1. Fetch records with relationships
    result = await db.execute(
        select(InventoryRecord)
        .options(selectinload(InventoryRecord.record_type))
        .where(InventoryRecord.id.in_(record_ids))
    )
    records = result.scalars().all()

    # 2. Create ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        
        # --- Part A: Master CSV ---
        csv_buffer = io.StringIO()
        csv_writer = csv.writer(csv_buffer)
        
        # Headers
        headers = [
            "ID", "Box Barcode", "File Barcode", "Entity", "Department", 
            "Location", "Date", "Status", "Legal Hold", "Description", "Created At"
        ]
        csv_writer.writerow(headers)
        
        for r in records:
            csv_writer.writerow([
                str(r.id), r.box_barcode, r.file_barcode, r.entity, r.department,
                r.location, r.record_date, r.disposition_status, r.legal_hold, r.description,
                r.created_at.isoformat() if r.created_at else ""
            ])
            
            # --- Part B: Individual JSONs ---
            record_data = {
                "metadata": {
                    "id": str(r.id),
                    "box_barcode": r.box_barcode,
                    "file_barcode": r.file_barcode,
                    "entity": r.entity,
                    "department": r.department,
                    "location": r.location,
                    "date": r.record_date,
                    "description": r.description,
                    "tags": r.tags,
                    "custom_fields": r.custom_fields,
                    "disposition_status": r.disposition_status,
                    "legal_hold": r.legal_hold
                },
                "export_info": {
                    "exported_at": str(uuid.uuid4()), # Placeholder for export tracking
                    "version": r.version
                }
            }
            
            json_filename = f"individual_records/{r.box_barcode}_{r.file_barcode}.json"
            zip_file.writestr(json_filename, json.dumps(record_data, indent=2))

        # Write CSV to ZIP
        zip_file.writestr("inventory_metadata.csv", csv_buffer.getvalue())

    zip_buffer.seek(0)
    return zip_buffer
