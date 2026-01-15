from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/dbname"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # N8N
    N8N_API_URL: Optional[str] = None
    N8N_API_KEY: Optional[str] = None
    N8N_WEBHOOK_URL: str = "http://194.44.193.90:5679/webhook/92d49b70-e031-4987-bc66-f9e7259bb769"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

