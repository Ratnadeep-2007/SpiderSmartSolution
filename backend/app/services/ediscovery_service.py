"""
e-Discovery Case Investigator Service.

Handles:
- Case workspace creation and management
- Semantic/keyword query scanning to locate matching records
- Bulk legal hold application
- Tamper-evident forensic ZIP archive generation (with audit chain + cryptographic manifest)
"""
import io
import zipfile
import csv
import json
import uuid
import hashlib
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from ..models.record import InventoryRecord
from ..models.audit_log import AuditLog
from .audit_service import create_audit_log

import logging
logger = logging.getLogger("app.services.ediscovery_service")


# ---------------------------------------------------------------------------
# Case Workspace  (module-level store — persists across requests, lost on restart)
# For production: replace with a DB table (ediscovery_cases)
# ---------------------------------------------------------------------------
_case_store: dict = {}


def create_case(
    title: str,
    description: str,
    query_keywords: List[str],
    created_by: str
) -> dict:
    """Initialize a new e-Discovery case workspace."""
    case_id = str(uuid.uuid4())
    case = {
        "id": case_id,
        "title": title,
        "description": description,
        "query_keywords": query_keywords,
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "OPEN",
        "matched_record_ids": [],
        "hold_applied": False
    }
    _case_store[case_id] = case
    return case


def get_case(case_id: str) -> Optional[dict]:
    return _case_store.get(case_id)


def list_cases() -> List[dict]:
    return list(_case_store.values())


async def scan_and_apply_hold(
    db: AsyncSession,
    case_id: str,
    performed_by: uuid.UUID
) -> dict:
    """
    Run keyword scan for a case, apply bulk legal hold on matched records,
    and update case workspace.
    """
    case = get_case(case_id)
    if not case:
        raise ValueError(f"Case {case_id} not found")

    keywords = case["query_keywords"]
    if not keywords:
        raise ValueError("Case has no query keywords defined")

    # Scan: ilike match across description, entity, department, tags
    from sqlalchemy import func, or_
    filters = []
    for kw in keywords:
        filters.append(InventoryRecord.description.ilike(f"%{kw}%"))
        filters.append(InventoryRecord.department.ilike(f"%{kw}%"))
        filters.append(InventoryRecord.entity.ilike(f"%{kw}%"))

    result = await db.execute(
        select(InventoryRecord)
        .where(and_(InventoryRecord.is_active == True, or_(*filters)))
    )
    matched = result.scalars().all()

    matched_ids = []
    for record in matched:
        record.legal_hold = True
        record.disposition_status = "LEGAL_HOLD"
        matched_ids.append(str(record.id))

    if matched_ids:
        await create_audit_log(
            db,
            action="EDISCOVERY_BULK_HOLD",
            performed_by=performed_by,
            record_id=None,
            changes={
                "case_id": case_id,
                "case_title": case["title"],
                "held_record_ids": matched_ids,
                "held_count": len(matched_ids)
            }
        )
        await db.commit()

    # Update case store
    case["matched_record_ids"] = matched_ids
    case["hold_applied"] = True
    case["status"] = "HOLD_APPLIED"

    return {
        "case_id": case_id,
        "matched_count": len(matched_ids),
        "record_ids": matched_ids
    }


async def generate_ediscovery_zip(
    db: AsyncSession,
    record_ids: List[uuid.UUID],
    case_id: Optional[str] = None
) -> io.BytesIO:
    """
    Generates a forensic ZIP archive containing:
    1. inventory_metadata.csv — master record listing
    2. individual_records/<barcode>.json — per-record JSON
    3. audit_chain.csv — all audit logs for matched records
    4. manifest.json — cryptographic hashes of every file in the archive
    """
    # 1. Fetch records
    result = await db.execute(
        select(InventoryRecord)
        .options(selectinload(InventoryRecord.record_type))
        .where(InventoryRecord.id.in_(record_ids))
    )
    records = result.scalars().all()

    # 2. Fetch related audit logs
    audit_result = await db.execute(
        select(AuditLog)
        .where(AuditLog.record_id.in_(record_ids))
        .order_by(AuditLog.performed_at.asc())
    )
    audit_logs = audit_result.scalars().all()

    zip_buffer = io.BytesIO()
    file_hashes: dict = {}

    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:

        # --- Part A: Master CSV ---
        csv_buffer = io.StringIO()
        csv_writer = csv.writer(csv_buffer)
        csv_writer.writerow([
            "ID", "Box Barcode", "File Barcode", "Entity", "Department",
            "Location", "Date", "Status", "Legal Hold", "Description", "Created At"
        ])
        for r in records:
            csv_writer.writerow([
                str(r.id), r.box_barcode, r.file_barcode, r.entity, r.department,
                r.location, r.record_date, r.disposition_status, r.legal_hold,
                r.description, r.created_at.isoformat() if r.created_at else ""
            ])
        csv_bytes = csv_buffer.getvalue().encode()
        zip_file.writestr("inventory_metadata.csv", csv_bytes)
        file_hashes["inventory_metadata.csv"] = hashlib.sha256(csv_bytes).hexdigest()

        # --- Part B: Individual record JSONs ---
        for r in records:
            record_data = {
                "metadata": {
                    "id": str(r.id),
                    "box_barcode": r.box_barcode,
                    "file_barcode": r.file_barcode,
                    "entity": r.entity,
                    "department": r.department,
                    "location": r.location,
                    "date": r.record_date.isoformat() if r.record_date else "",
                    "description": r.description,
                    "tags": r.tags,
                    "custom_fields": r.custom_fields,
                    "disposition_status": r.disposition_status,
                    "legal_hold": r.legal_hold,
                    "version": r.version
                },
                "export_info": {
                    "case_id": case_id,
                    "exported_at": datetime.now(timezone.utc).isoformat(),
                }
            }
            json_bytes = json.dumps(record_data, indent=2).encode()
            filename = f"individual_records/{r.box_barcode}_{r.file_barcode}.json"
            zip_file.writestr(filename, json_bytes)
            file_hashes[filename] = hashlib.sha256(json_bytes).hexdigest()

        # --- Part C: Audit chain CSV ---
        audit_csv = io.StringIO()
        audit_writer = csv.writer(audit_csv)
        audit_writer.writerow([
            "Log ID", "Record ID", "Action", "Performed By", "Performed At",
            "IP Address", "Changes", "Previous Hash", "Tamper Hash"
        ])
        for log in audit_logs:
            audit_writer.writerow([
                str(log.id), str(log.record_id), log.action,
                str(log.performed_by), log.performed_at.isoformat() if log.performed_at else "",
                log.ip_address,
                json.dumps(log.changes),
                log.previous_hash or "",
                log.tamper_hash or ""
            ])
        audit_bytes = audit_csv.getvalue().encode()
        zip_file.writestr("audit_chain.csv", audit_bytes)
        file_hashes["audit_chain.csv"] = hashlib.sha256(audit_bytes).hexdigest()

        # --- Part D: Cryptographic manifest ---
        manifest = {
            "case_id": case_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "record_count": len(records),
            "audit_log_count": len(audit_logs),
            "file_hashes": file_hashes,
            "archive_integrity": hashlib.sha256(
                json.dumps(file_hashes, sort_keys=True).encode()
            ).hexdigest()
        }
        manifest_bytes = json.dumps(manifest, indent=2).encode()
        zip_file.writestr("manifest.json", manifest_bytes)

    zip_buffer.seek(0)
    return zip_buffer
