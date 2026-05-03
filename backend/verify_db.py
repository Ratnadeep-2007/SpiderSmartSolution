import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models.master import Category, AutoClassificationRule

async def verify():
    async with AsyncSessionLocal() as db:
        print("Checking Categories...")
        try:
            result = await db.execute(
                select(Category)
                .where(Category.parent_id == None)
                .options(selectinload(Category.children))
            )
            cats = result.scalars().all()
            print(f"Found {len(cats)} root categories.")
            for c in cats:
                print(f" - {c.name} (ID: {c.id})")
        except Exception as e:
            print(f"Error fetching categories: {e}")

        print("\nChecking Classification Rules...")
        try:
            result = await db.execute(select(AutoClassificationRule))
            rules = result.scalars().all()
            print(f"Found {len(rules)} rules.")
        except Exception as e:
            print(f"Error fetching rules: {e}")

if __name__ == "__main__":
    asyncio.run(verify())
