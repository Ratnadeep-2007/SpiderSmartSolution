import os
import asyncio
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Load environment
load_dotenv(".env")  # Load from cwd (run from backend/)
db_url = os.getenv("DATABASE_URL")

async def main():
    if not db_url:
        print("Error: DATABASE_URL not found in .env")
        return

    print("Connecting to database...")
    engine = create_async_engine(db_url)
    
    async with engine.begin() as conn:
        print("Enabling vector extension...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        
        print("Adding embedding column to public.inventory_records...")
        # Add column if not exists
        await conn.execute(text("""
            ALTER TABLE public.inventory_records 
            ADD COLUMN IF NOT EXISTS embedding vector(768);
        """))
        print("Schema migration complete!")

if __name__ == "__main__":
    asyncio.run(main())
