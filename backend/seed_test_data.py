import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from datetime import date

# Load env vars
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "postgresql+asyncpg://postgres.emywxyvirwuygohpjxus:ratnadip123@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Import models
import sys
sys.path.append(os.getcwd())
from app.models.master import RecordType, RecordTypeField, Entity, Department, EntityType
from app.models.record import InventoryRecord
from app.models.user import User

engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed_data():
    async with AsyncSessionLocal() as db:
        print("--- Starting Seeding Process ---")

        # 0. Get a valid user ID
        result = await db.execute(select(User).where(User.email == "admin@spidersmart.com"))
        admin_user = result.scalar_one_or_none()
        if not admin_user:
            print("Error: Admin user not found. Please run seed_user.py first.")
            return
        admin_id = admin_user.id

        # 1. Ensure we have an Entity and Department to link to
        result = await db.execute(select(EntityType).limit(1))
        et = result.scalar_one_or_none()
        if not et:
            et = EntityType(name="Corporate")
            db.add(et)
            await db.flush()

        result = await db.execute(select(Entity).limit(1))
        entity = result.scalar_one_or_none()
        if not entity:
            entity = Entity(name="Headquarters", entity_code="HQ001")
            db.add(entity)
            await db.flush()

        result = await db.execute(select(Department).where(Department.entity_id == entity.id).limit(1))
        dept = result.scalar_one_or_none()
        if not dept:
            dept = Department(name="Finance", entity_id=entity.id)
            db.add(dept)
            await db.flush()

        # 2. Create Record Types (Field Schemas)
        
        # FINANCE TYPE
        result = await db.execute(select(RecordType).where(RecordType.name == "Financial Records"))
        fin_rt = result.scalar_one_or_none()
        if not fin_rt:
            fin_rt = RecordType(name="Financial Records", description="Invoices, receipts, and tax documents")
            db.add(fin_rt)
            await db.flush()
            
            fields = [
                RecordTypeField(record_type_id=fin_rt.id, name="invoice_number", label="Invoice #", field_type="text", is_required=True),
                RecordTypeField(record_type_id=fin_rt.id, name="amount", label="Total Amount", field_type="number", is_required=True),
                RecordTypeField(record_type_id=fin_rt.id, name="vendor", label="Vendor Name", field_type="text", is_required=False),
                RecordTypeField(record_type_id=fin_rt.id, name="is_tax_deductible", label="Tax Deductible", field_type="boolean", is_required=False)
            ]
            db.add_all(fields)
            print("Added Finance Record Type and Fields")

        # HR TYPE
        result = await db.execute(select(RecordType).where(RecordType.name == "HR Personnel Files"))
        hr_rt = result.scalar_one_or_none()
        if not hr_rt:
            hr_rt = RecordType(name="HR Personnel Files", description="Employee contracts and evaluations")
            db.add(hr_rt)
            await db.flush()
            
            fields = [
                RecordTypeField(record_type_id=hr_rt.id, name="employee_id", label="Employee ID", field_type="text", is_required=True),
                RecordTypeField(record_type_id=hr_rt.id, name="employee_name", label="Full Name", field_type="text", is_required=True),
                RecordTypeField(record_type_id=hr_rt.id, name="hire_date", label="Hire Date", field_type="date", is_required=False)
            ]
            db.add_all(fields)
            print("Added HR Record Type and Fields")

        await db.commit()

        # 3. Create sample Records
        print("Adding sample records...")
        
        # Sample Finance Record
        fin_rec = InventoryRecord(
            entity_type_id=et.id,
            entity_id=entity.id,
            department_id=dept.id,
            record_type_id=fin_rt.id,
            entity=entity.name,
            entity_code=entity.entity_code,
            department=dept.name,
            entity_type=et.name,
            box_barcode="BOX10000001",
            file_barcode="FILE100000001",
            description="FY2025 Q1 Vendor Invoices",
            record_date=date(2025, 3, 15),
            location="SHELF-A1",
            custom_fields={
                "invoice_number": "INV-999-01",
                "amount": 1500.50,
                "vendor": "Acme Corp",
                "is_tax_deductible": True
            },
            disposition_status="ACTIVE",
            created_by=admin_id
        )
        
        # Sample HR Record
        hr_rec = InventoryRecord(
            entity_type_id=et.id,
            entity_id=entity.id,
            department_id=dept.id,
            record_type_id=hr_rt.id,
            entity=entity.name,
            entity_code=entity.entity_code,
            department=dept.name,
            entity_type=et.name,
            box_barcode="BOX20000001",
            file_barcode="FILE200000001",
            description="John Doe Employment File",
            record_date=date(2024, 11, 20),
            location="SECURE-B2",
            custom_fields={
                "employee_id": "EMP-042",
                "employee_name": "John Doe",
                "hire_date": "2024-11-01"
            },
            disposition_status="ACTIVE",
            created_by=admin_id
        )
        
        db.add_all([fin_rec, hr_rec])
        await db.commit()
        print("--- Seeding Completed Successfully ---")

if __name__ == "__main__":
    asyncio.run(seed_data())
