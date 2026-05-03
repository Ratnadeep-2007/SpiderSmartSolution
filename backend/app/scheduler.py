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
    
    scheduler.start()
    app.state.scheduler = scheduler
    logger.info("APScheduler initialized and started.")
