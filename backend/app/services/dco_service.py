"""
Digital Compliance Officer (DCO) Agent Service.

Scans records past their retention due date, groups them by department,
generates disposal manifests, and creates signed JWT approval tokens for
manager sign-off. Upon approval, executes bulk disposal with audit chaining.
"""
import uuid
import json
import hashlib
import logging
from datetime import date, datetime, timezone, timedelta
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from ..models.record import InventoryRecord
from ..models.audit_log import AuditLog
from ..config import settings
from .audit_service import create_audit_log

logger = logging.getLogger("app.services.dco_service")


def generate_approval_token(manifest_id: str, department: str, record_ids: List[str]) -> str:
    """
    Generate a signed approval token for manager sign-off using HMAC-SHA256.
    """
    import hmac as hmac_module
    import base64
    payload = {
        "manifest_id": manifest_id,
        "department": department,
        "record_ids": record_ids,
        "exp": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "type": "disposal_approval"
    }
    payload_json = json.dumps(payload, sort_keys=True)
    signature = hmac_module.new(
        settings.SECRET_KEY.encode(),
        payload_json.encode(),
        hashlib.sha256
    ).hexdigest()
    token_body = base64.urlsafe_b64encode(payload_json.encode()).decode()
    return f"{token_body}.{signature}"


def verify_approval_token(token: str) -> Dict[str, Any] | None:
    """Verify and decode a disposal approval token."""
    import hmac as hmac_module
    import base64
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        token_body, signature = parts
        payload_json = base64.urlsafe_b64decode(token_body.encode()).decode()
        expected_sig = hmac_module.new(
            settings.SECRET_KEY.encode(),
            payload_json.encode(),
            hashlib.sha256
        ).hexdigest()
        if not hmac_module.compare_digest(signature, expected_sig):
            return None
        payload = json.loads(payload_json)
        exp = datetime.fromisoformat(payload["exp"])
        if datetime.now(timezone.utc) > exp:
            return None
        if payload.get("type") != "disposal_approval":
            return None
        return payload
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return None


async def run_dco_agent(db: AsyncSession) -> Dict[str, Any]:
    """
    Main DCO Agent sweep:
    1. Scan records where retention_due_date <= today, status=ACTIVE, legal_hold=False
    2. Group by department
    3. Generate approval manifests per department
    4. Return manifest metadata (in production: send via email)
    """
    today = date.today()

    result = await db.execute(
        select(InventoryRecord).where(
            InventoryRecord.retention_due_date <= today,
            InventoryRecord.disposition_status == "ACTIVE",
            InventoryRecord.legal_hold == False,
            InventoryRecord.is_active == True
        )
    )
    overdue_records = result.scalars().all()

    if not overdue_records:
        return {"manifests_generated": 0, "records_flagged": 0, "manifests": []}

    # Group by department
    by_department: Dict[str, List[InventoryRecord]] = {}
    for record in overdue_records:
        dept = record.department or "Unknown"
        by_department.setdefault(dept, []).append(record)

    manifests = []
    for department, records in by_department.items():
        manifest_id = str(uuid.uuid4())
        record_ids = [str(r.id) for r in records]
        token = generate_approval_token(manifest_id, department, record_ids)

        manifest = {
            "manifest_id": manifest_id,
            "department": department,
            "record_count": len(records),
            "due_date": today.isoformat(),
            "approval_token": token,
            "approval_url": f"/api/v1/dco/approve?token={token}",
            "records": [
                {
                    "id": str(r.id),
                    "box_barcode": r.box_barcode,
                    "file_barcode": r.file_barcode,
                    "description": r.description,
                    "retention_due_date": r.retention_due_date.isoformat() if r.retention_due_date else None
                }
                for r in records
            ]
        }
        manifests.append(manifest)
        logger.info(f"DCO: Generated manifest {manifest_id} for dept '{department}' with {len(records)} records.")

    return {
        "manifests_generated": len(manifests),
        "records_flagged": len(overdue_records),
        "manifests": manifests
    }


async def execute_bulk_disposal(
    db: AsyncSession,
    token: str,
    approved_by: uuid.UUID
) -> Dict[str, Any]:
    """
    Execute bulk disposal upon receiving a valid signed manager approval token.
    Marks all records as DISPOSED and logs a BULK_DISPOSE action in the audit chain.
    """
    payload = verify_approval_token(token)
    if not payload:
        raise ValueError("Invalid or expired approval token")

    record_ids = [uuid.UUID(rid) for rid in payload["record_ids"]]
    manifest_id = payload["manifest_id"]
    department = payload["department"]

    # Fetch records and verify they're still eligible
    result = await db.execute(
        select(InventoryRecord).where(
            InventoryRecord.id.in_(record_ids),
            InventoryRecord.legal_hold == False,
            InventoryRecord.is_active == True
        )
    )
    eligible_records = result.scalars().all()

    disposed_ids = []
    for record in eligible_records:
        record.disposition_status = "DISPOSED"
        record.is_active = False
        disposed_ids.append(record.id)

    if disposed_ids:
        # Create one BULK_DISPOSE audit log per manifest
        await create_audit_log(
            db,
            action="BULK_DISPOSE",
            performed_by=approved_by,
            record_id=None,
            changes={
                "manifest_id": manifest_id,
                "department": department,
                "disposed_record_ids": [str(rid) for rid in disposed_ids],
                "disposed_count": len(disposed_ids)
            }
        )
        await db.commit()

    return {
        "manifest_id": manifest_id,
        "department": department,
        "disposed_count": len(disposed_ids),
        "skipped_count": len(record_ids) - len(disposed_ids)
    }
