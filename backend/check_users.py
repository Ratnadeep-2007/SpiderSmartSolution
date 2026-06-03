import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User

async def check():
    async with AsyncSessionLocal() as db:
        print("Checking Users...")
        try:
            result = await db.execute(select(User))
            users = result.scalars().all()
            for u in users:
                print(f" - Email: {u.email}, Role: {u.role}, Scoped Filters: {u.scoped_filters}")
        except Exception as e:
            print(f"Error checking users: {e}")

if __name__ == "__main__":
    asyncio.run(check())
