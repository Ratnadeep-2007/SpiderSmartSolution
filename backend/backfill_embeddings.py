import os
import asyncio
import logging
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backfill")

# Load environment
load_dotenv("E:/Skills/Webstack/Spider_internship/backend/.env")
db_url = os.getenv("DATABASE_URL")

async def main():
    if not db_url:
        logger.error("DATABASE_URL not found in .env")
        return

    logger.info("Initializing DB connection...")
    engine = create_async_engine(db_url)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    from app.services.embedding_service import backfill_embeddings
    
    logger.info("Starting backfill process...")
    async with async_session() as db:
        total_backfilled = 0
        while True:
            logger.info("Running chunk backfill...")
            count = await backfill_embeddings(db)
            if count == 0:
                logger.info("No more records without embeddings found.")
                break
            total_backfilled += count
            logger.info(f"Successfully backfilled {count} records in this batch. Total so far: {total_backfilled}")
            # Pause to avoid rate limits
            await asyncio.sleep(1.0)
            
    logger.info(f"Backfill finished. Total records updated: {total_backfilled}")

if __name__ == "__main__":
    asyncio.run(main())
