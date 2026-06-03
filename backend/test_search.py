import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.services import search_service

async def test():
    async with AsyncSessionLocal() as db:
        print("Testing search_records...")
        try:
            res = await search_service.search_records(db)
            print(f"Total found: {res['total']}")
            print(f"Data length: {len(res['data'])}")
            if len(res['data']) > 0:
                first = res['data'][0]
                print(f"First record category: {first.category}")
        except Exception as e:
            print(f"ERROR in search_records: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
