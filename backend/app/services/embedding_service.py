import os
import httpx
import logging
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..config import settings
from ..models.record import InventoryRecord

logger = logging.getLogger("app.services.embedding_service")

def get_record_text_representation(record: InventoryRecord) -> str:
    """
    Constructs a textual representation of an InventoryRecord for embedding.
    """
    parts = []
    if record.description:
        parts.append(f"Description: {record.description}")
    if record.entity:
        parts.append(f"Entity: {record.entity}")
    if record.department:
        parts.append(f"Department: {record.department}")
    if record.entity_type:
        parts.append(f"Entity Type: {record.entity_type}")
    if record.location:
        parts.append(f"Location: {record.location}")
    if record.box_barcode:
        parts.append(f"Box Barcode: {record.box_barcode}")
    if record.file_barcode:
        parts.append(f"File Barcode: {record.file_barcode}")
    if record.tags:
        parts.append(f"Tags: {', '.join(record.tags)}")
    return " | ".join(parts)

async def get_embedding(text: str) -> Optional[List[float]]:
    """
    Calls Gemini text-embedding-004 model to get a 768-dim text embedding.
    """
    gemini_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        logger.error("GEMINI_API_KEY not configured for embeddings.")
        return None
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={gemini_key}"
    payload = {
        "model": "models/text-embedding-004",
        "content": {
            "parts": [{
                "text": text
            }]
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10.0)
        if resp.status_code == 200:
            data = resp.json()
            return data["embedding"]["values"]
        else:
            logger.error(f"Gemini embedding call failed: Status {resp.status_code}, Response: {resp.text}")
            return None
    except Exception as e:
        logger.error(f"Exception calling Gemini embedding API: {str(e)}")
        return None

async def update_record_embedding(db: AsyncSession, record_id: uuid.UUID) -> bool:
    """
    Generates embedding for a specific record and updates it.
    """
    result = await db.execute(select(InventoryRecord).where(InventoryRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        logger.warning(f"Record '{record_id}' not found to update embedding.")
        return False
        
    text = get_record_text_representation(record)
    embedding = await get_embedding(text)
    if embedding:
        record.embedding = embedding
        await db.commit()
        logger.info(f"Successfully generated and saved embedding for record '{record_id}'")
        return True
    return False

async def backfill_embeddings(db: AsyncSession) -> int:
    """
    Backfills embeddings for all active records that do not have one.
    """
    result = await db.execute(
        select(InventoryRecord)
        .where(InventoryRecord.is_active == True, InventoryRecord.embedding == None)
        .limit(100)
    )
    records = result.scalars().all()
    if not records:
        return 0
        
    count = 0
    for record in records:
        text = get_record_text_representation(record)
        embedding = await get_embedding(text)
        if embedding:
            record.embedding = embedding
            count += 1
            
    if count > 0:
        await db.commit()
        logger.info(f"Backfilled {count} records with embeddings.")
        
    return count
