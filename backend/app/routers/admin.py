from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid

from ..database import get_db
from ..schemas import user as user_schemas
from ..models.user import User
from ..dependencies.auth import get_current_user, check_role

router = APIRouter(prefix="/admin", tags=["admin"])

from ..services.auth_service import get_password_hash

@router.post("/users", response_model=user_schemas.UserInDB)
async def create_user(
    user_in: user_schemas.UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN"]))
):
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Check if user_id already exists
    if user_in.user_id:
        result = await db.execute(select(User).where(User.user_id == user_in.user_id))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="User with this User ID already exists")
    
    db_user = User(
        email=user_in.email,
        user_id=user_in.user_id,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=user_in.is_active,
        expires_at=user_in.expires_at,
        scoped_filters=user_in.scoped_filters
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    # In a real app, send invitation email here
    return db_user

@router.get("/users", response_model=List[user_schemas.UserInDB])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN"]))
):
    result = await db.execute(select(User))
    return result.scalars().all()

@router.patch("/users/{user_id}", response_model=user_schemas.UserInDB)
async def update_user(
    user_id: uuid.UUID,
    user_update: user_schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN"]))
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check UserID uniqueness if it's being updated
    if user_update.user_id and user_update.user_id != user.user_id:
        existing = await db.execute(select(User).where(User.user_id == user_update.user_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="User ID already taken")

    # Update fields
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/users/{user_id}/role", response_model=user_schemas.UserInDB)
async def update_user_role(
    user_id: uuid.UUID,
    role: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN"]))
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = role
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/users/{user_id}/status", response_model=user_schemas.UserInDB)
async def toggle_user_status(
    user_id: uuid.UUID,
    is_active: bool = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(check_role(["SYSTEM_ADMIN"]))
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = is_active
    await db.commit()
    await db.refresh(user)
    return user

