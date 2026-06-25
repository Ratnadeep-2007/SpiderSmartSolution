from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.ext.asyncio import AsyncSession
from .database import AsyncSessionLocal
from .services import retention_service, classification_service
import logging

logger = logging.getLogger(__name__)

async def run_retention_sweep():
    """Background task to update records to DUE based on retention date"""
    async with AsyncSessionLocal() as db:
        try:
            count = await retention_service.sweep_retention_dates(db)
            if count > 0:
                logger.info(f"Retention sweep complete. Updated {count} records to DUE state.")
        except Exception as e:
            logger.error(f"Error during retention sweep background job: {e}")

async def run_classification_sweep():
    """Background task to apply auto-classification rules"""
    async with AsyncSessionLocal() as db:
        try:
            await classification_service.run_auto_classification_batch(db)
            logger.info("Auto-classification sweep complete.")
        except Exception as e:
            logger.error(f"Error during classification sweep background job: {e}")

async def run_embedding_backfill():
    """Background task to backfill embeddings for records missing them"""
    async with AsyncSessionLocal() as db:
        try:
            from .services.embedding_service import backfill_embeddings
            count = await backfill_embeddings(db)
            if count > 0:
                logger.info(f"Embedding backfill complete. Updated {count} records.")
        except Exception as e:
            logger.error(f"Error during embedding backfill job: {e}")

async def run_dco_sweep():
    """
    Digital Compliance Officer Agent:
    Scans for records past retention due date and queues them for disposal approval.
    """
    async with AsyncSessionLocal() as db:
        try:
            from .services.dco_service import run_dco_agent
            result = await run_dco_agent(db)
            if result["manifests_generated"] > 0:
                logger.info(f"DCO Agent: Generated {result['manifests_generated']} disposal manifests for {result['records_flagged']} records.")
        except Exception as e:
            logger.error(f"Error during DCO agent sweep: {e}")

def setup_scheduler(app):
    scheduler = AsyncIOScheduler()
    
    # Run every night at 2:00 AM
    scheduler.add_job(
        run_retention_sweep,
        CronTrigger(hour=2, minute=0),
        id="retention_sweep",
        replace_existing=True
    )
    
    # Classification: Run every 5 minutes
    scheduler.add_job(
        run_classification_sweep,
        "interval",
        minutes=5,
        id="classification_sweep"
    )

    # Embedding backfill: Run every 30 minutes to catch new/updated records
    scheduler.add_job(
        run_embedding_backfill,
        "interval",
        minutes=30,
        id="embedding_backfill"
    )

    # DCO Agent: Run every night at 3:00 AM
    scheduler.add_job(
        run_dco_sweep,
        CronTrigger(hour=3, minute=0),
        id="dco_agent_sweep",
        replace_existing=True
    )
    
    scheduler.start()
    app.state.scheduler = scheduler
    logger.info("APScheduler initialized and started.")
