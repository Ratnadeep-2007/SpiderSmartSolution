import asyncio
import os
import uuid
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Load env vars
load_dotenv(".env")
DATABASE_URL = os.getenv("DATABASE_URL")

async def main():
    if not DATABASE_URL:
        print("DATABASE_URL not found in .env")
        return

    print("Connecting to database:", DATABASE_URL.split("@")[-1])
    engine = create_async_engine(DATABASE_URL)

    async with engine.begin() as conn:
        print("Creating warehouses table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.warehouses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) UNIQUE NOT NULL,
                address TEXT,
                is_active BOOLEAN DEFAULT TRUE
            );
        """))

        print("Creating warehouse_zones table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.warehouse_zones (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
                name VARCHAR(50) NOT NULL,
                description TEXT
            );
        """))

        print("Creating warehouse_aisles table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.warehouse_aisles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                zone_id UUID REFERENCES public.warehouse_zones(id) ON DELETE CASCADE NOT NULL,
                label VARCHAR(20) NOT NULL
            );
        """))

        print("Creating warehouse_shelves table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.warehouse_shelves (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                aisle_id UUID REFERENCES public.warehouse_aisles(id) ON DELETE CASCADE NOT NULL,
                level INTEGER NOT NULL,
                max_capacity INTEGER DEFAULT 100
            );
        """))

        print("Creating warehouse_bins table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.warehouse_bins (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                shelf_id UUID REFERENCES public.warehouse_shelves(id) ON DELETE CASCADE NOT NULL,
                bin_code VARCHAR(30) UNIQUE NOT NULL,
                is_occupied BOOLEAN DEFAULT FALSE,
                record_id UUID REFERENCES public.inventory_records(id) ON DELETE SET NULL,
                pos_x FLOAT,
                pos_y FLOAT
            );
        """))

        print("Tables created successfully!")

        # Check if we already have a warehouse seeded
        result = await conn.execute(text("SELECT count(*) FROM public.warehouses"))
        count = result.scalar()
        if count == 0:
            print("Seeding default warehouse layout...")
            wh_id = uuid.uuid4()
            await conn.execute(text("""
                INSERT INTO public.warehouses (id, name, address, is_active)
                VALUES (:id, 'Warehouse A - Main Vault', '123 Logistics Way, Abu Dhabi', true)
            """), {"id": wh_id})

            zone_id = uuid.uuid4()
            await conn.execute(text("""
                INSERT INTO public.warehouse_zones (id, warehouse_id, name, description)
                VALUES (:id, :wh_id, 'Zone 1 - High Security', 'Secure documents and high value items')
            """), {"id": zone_id, "wh_id": wh_id})

            aisle_id = uuid.uuid4()
            await conn.execute(text("""
                INSERT INTO public.warehouse_aisles (id, zone_id, label)
                VALUES (:id, :zone_id, 'Aisle A1')
            """), {"id": aisle_id, "zone_id": zone_id})

            shelf_id = uuid.uuid4()
            await conn.execute(text("""
                INSERT INTO public.warehouse_shelves (id, aisle_id, level, max_capacity)
                VALUES (:id, :aisle_id, 1, 100)
            """), {"id": shelf_id, "aisle_id": aisle_id})

            # Seed 5 bins
            for i in range(1, 6):
                bin_id = uuid.uuid4()
                bin_code = f"A1-S1-B0{i}"
                pos_x = 0.1 * i
                pos_y = 0.2
                await conn.execute(text("""
                    INSERT INTO public.warehouse_bins (id, shelf_id, bin_code, is_occupied, pos_x, pos_y)
                    VALUES (:id, :shelf_id, :bin_code, false, :pos_x, :pos_y)
                """), {"id": bin_id, "shelf_id": shelf_id, "bin_code": bin_code, "pos_x": pos_x, "pos_y": pos_y})

            print("Default warehouse and mock layout seeded successfully!")
        else:
            print("Warehouse already seeded.")

if __name__ == "__main__":
    asyncio.run(main())
