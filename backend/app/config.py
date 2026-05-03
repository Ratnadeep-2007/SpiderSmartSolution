from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "SpiderSmart IMS"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "development_secret_key_change_me_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours as per PRD
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/spidersmart_ims"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173"]
    
    # Audit
    AUDIT_LOG_READ_EVENTS: bool = False

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
