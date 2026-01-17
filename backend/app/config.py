from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # N8N
    N8N_API_URL: Optional[str] = None
    N8N_API_KEY: Optional[str] = None
    N8N_WEBHOOK_URL: str
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"  # Allow extra environment variables
    }


settings = Settings()

