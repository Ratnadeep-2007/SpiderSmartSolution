import asyncio
import uuid
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models.record import InventoryRecord

async def check():
    async with AsyncSessionLocal() as db:
        print("Checking Inventory Records...")
        try:
            # Count total
            count_result = await db.execute(select(func.count()).select_from(InventoryRecord))
            total = count_result.scalar_one()
            print(f"Total Records: {total}")

            if total > 0:
                # Sample records
                result = await db.execute(select(InventoryRecord))
                records = result.scalars().all()
                print("\nAll Records:")
                for r in records:
                    print(f" - ID: {r.id}")
                    print(f"   Barcode: {r.box_barcode}")
                    print(f"   Category ID: {r.category_id}")
                    print(f"   Tags: {r.tags}")
                    print("-" * 20)
            else:
                print("No records found in database.")

        except Exception as e:
            print(f"Error checking records: {e}")

if __name__ == "__main__":
    asyncio.run(check())
