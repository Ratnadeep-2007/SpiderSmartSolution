import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import settings
from app.models.master import RecordType, RecordTypeField, Entity, Department, Location

async def seed():
    engine = create_async_engine(settings.DATABASE_URL.replace("asyncpg", "asyncpg"))
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        # 1. Create a Record Type
        box_type = RecordType(
            id=uuid.uuid4(),
            name="Box Record",
            description="Detailed metadata for storage boxes",
            icon="box"
        )
        session.add(box_type)
        await session.flush()

        fields = [
            RecordTypeField(
                record_type_id=box_type.id,
                name="project_code",
                label="Project Code",
                field_type="text",
                is_required=True
            ),
            RecordTypeField(
                record_type_id=box_type.id,
                name="is_confidential",
                label="Confidential?",
                field_type="boolean",
                is_required=False,
                default_value="false"
            ),
            RecordTypeField(
                record_type_id=box_type.id,
                name="weight_kg",
                label="Weight (kg)",
                field_type="number",
                is_required=False
            )
        ]
        session.add_all(fields)

        # 2. Add some entities/depts
        spider = Entity(name="Spider Smart", entity_code="11")
        session.add(spider)
        await session.flush()

        depts = [
            Department(entity_id=spider.id, name="Human Resources"),
            Department(entity_id=spider.id, name="Finance"),
            Department(entity_id=spider.id, name="IT Operations")
        ]
        session.add_all(depts)

        # 3. Add some locations
        locs = [
            Location(name="Warehouse A"),
            Location(name="Warehouse B"),
            Location(name="Main Office")
        ]
        session.add_all(locs)

        await session.commit()
        print("Master data seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed())
