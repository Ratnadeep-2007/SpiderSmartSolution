from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.user import User
from ..schemas.token import Token
from ..schemas.user import UserInDB
from ..services import auth_service
from ..config import settings
from ..dependencies.auth import get_current_user

import os
import time

def log_auth(message):
    try:
        log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "passenger_debug.log")
        with open(log_path, "a") as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [AUTH] {message}\n")
    except Exception:
        pass

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_access_token(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    log_auth(f"Login request received for username: {form_data.username}")
    
    try:
        query = select(User).where(User.email == form_data.username)
        log_auth("Executing database query...")
        result = await db.execute(query)
        log_auth("Database query executed successfully.")
        user = result.scalar_one_or_none()
        log_auth(f"User search outcome: {'Found' if user else 'Not Found'}")
    except Exception as db_err:
        log_auth(f"Database query FAILED: {db_err}")
        raise
        
    if not user or not auth_service.verify_password(form_data.password, user.hashed_password):
        log_auth("Credentials verification failed (incorrect email or password).")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    elif not user.is_active:
        log_auth(f"User account {form_data.username} is inactive.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
        )
        
    log_auth("Credentials verified successfully. Generating access token...")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = {
        "access_token": auth_service.create_access_token(
            data={"sub": user.email, "role": user.role}, 
            expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
    log_auth("Access token generated successfully.")
    return token


@router.get("/me", response_model=UserInDB)
async def read_user_me(
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user
