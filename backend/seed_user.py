import asyncio
import uuid
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.services.auth_service import get_password_hash

async def seed_admin():
    async with AsyncSessionLocal() as db:
        # Check if admin exists
        query = select(User).where(User.email == "admin@spidersmart.com")
        result = await db.execute(query)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print("Admin user already exists. Updating password...")
            new_hash = get_password_hash("admin123")
            existing_user.hashed_password = new_hash
            await db.commit()
            print(f"Password updated for admin@spidersmart.com")
            print(f"New Hash: {new_hash}")
            return

        # Create Admin
        new_hash = get_password_hash("admin123")
        admin = User(
            email="admin@spidersmart.com",
            hashed_password=new_hash,
            role="SYSTEM_ADMIN",
            is_active=True
        )
        db.add(admin)
        await db.commit()
        print("Admin user created successfully!")
        print("Email: admin@spidersmart.com")
        print("Password: admin123")
        print(f"New Hash: {new_hash}")

if __name__ == "__main__":
    asyncio.run(seed_admin())
