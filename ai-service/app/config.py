"""Configuration management for AI service."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings from environment variables."""
    
    # AI Configuration
    google_generative_ai_api_key: Optional[str] = None
    ai_model: str = "gemini-3.1-flash-lite"
    
    # CORS
    cors_allowed_origins: str = "http://localhost:3000"
    
    # Server
    port: int = 8001
    
    # Clerk Authentication
    clerk_publishable_key: Optional[str] = None
    clerk_secret_key: Optional[str] = None
    
    # Feature Flags
    require_auth: bool = False  # Set to True in production
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
