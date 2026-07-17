from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from .config import settings

# Create async engine with NullPool to prevent event loop mismatch errors in Passenger
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # Set to False in production to avoid cluttering cPanel logs
    future=True,
    poolclass=NullPool
)


# Create session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Base class for models
class Base(DeclarativeBase):
    pass

# Dependency to get DB session
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
