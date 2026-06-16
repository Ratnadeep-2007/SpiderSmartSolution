import asyncio
import os
import uuid
from datetime import date
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# Load env
load_dotenv("E:/Skills/Webstack/Spider_internship/backend/.env")
db_url = os.getenv("DATABASE_URL")

async def test_semantic_flow():
    if not db_url:
        print("DATABASE_URL not found")
        return
        
    engine = create_async_engine(db_url)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    from app.models.user import User
    from app.models.master import RecordType, Entity, Department, EntityType, Location
    from app.schemas.record import RecordCreate
    from app.services import record_service, search_service
    
    async with async_session() as db:
        # 1. Fetch default user
        user_result = await db.execute(select(User).limit(1))
        user = user_result.scalar_one_or_none()
        if not user:
            print("No user found in database. Seed the database first.")
            return
        print(f"Found test user: {user.email}")
        
        # 2. Fetch master data to create record
        rt_res = await db.execute(select(RecordType).options(selectinload(RecordType.fields)).limit(1))
        record_type = rt_res.scalar_one_or_none()
        
        ent_res = await db.execute(select(Entity).limit(1))
        entity = ent_res.scalar_one_or_none()
        
        dept_res = await db.execute(select(Department).limit(1))
        dept = dept_res.scalar_one_or_none()
        
        et_res = await db.execute(select(EntityType).limit(1))
        entity_type = et_res.scalar_one_or_none()
        
        if not all([record_type, entity, dept, entity_type]):
            print("Missing master data. Seed master data first.")
            return
            
        print("Creating a new unique record to check automatic embedding generation...")
        box_bar = f"BOX-SEM-{uuid.uuid4().hex[:6].upper()}"
        file_bar = f"FIL-SEM-{uuid.uuid4().hex[:6].upper()}"
        description = "Confidential medical records containing patient laboratory charts and treatment logs"
        
        # Handle required custom fields dynamically
        custom_fields = {}
        for field in record_type.fields:
            if field.is_required:
                custom_fields[field.name] = "12345" # generic test value
                
        record_in = RecordCreate(
            record_type_id=record_type.id,
            entity_id=entity.id,
            department_id=dept.id,
            entity_type_id=entity_type.id,
            location="Storage Room 4",
            box_barcode=box_bar,
            file_barcode=file_bar,
            description=description,
            record_date=date.today(),
            custom_fields=custom_fields
        )
        
        new_record = await record_service.create_record(db, record_in, user.id)
        print("Record created successfully!")
        print(f"Record Box Barcode: {new_record.box_barcode}")
        print(f"Record Embedding exists? {'YES' if new_record.embedding is not None else 'NO'}")
        if new_record.embedding:
            print(f"Embedding length: {len(new_record.embedding)}")
            
        # 3. Test Semantic Search
        print("\n--- TESTING SEMANTIC SEARCH ---")
        # We search for "physician health reports" which matches "medical records", "patient laboratory charts", etc.
        query = "physician health reports"
        print(f"Searching semantically for: '{query}'")
        sem_res = await search_service.search_records(db, q=query, semantic=True)
        print(f"Semantic search found {len(sem_res['data'])} records.")
        for r in sem_res['data'][:5]:
            print(f" - [{r.box_barcode}] {r.description}")
            
        print("\n--- TESTING STANDARD KEYWORD SEARCH ---")
        kw_res = await search_service.search_records(db, q=query, semantic=False)
        print(f"Keyword search found {len(kw_res['data'])} records.")
        for r in kw_res['data'][:5]:
            print(f" - [{r.box_barcode}] {r.description}")

if __name__ == "__main__":
    asyncio.run(test_semantic_flow())
