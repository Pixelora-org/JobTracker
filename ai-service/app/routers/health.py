"""Health check endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel
from app.config import settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    version: str
    ai_configured: bool


@router.get("/", response_model=dict)
async def root():
    """Root endpoint redirects to health check."""
    return {"message": "Pipeline AI Service", "health": "/health"}


@router.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint for Railway and monitoring."""
    ai_configured = bool(settings.google_generative_ai_api_key)
    
    return HealthResponse(
        status="healthy",
        version="0.2.0",
        ai_configured=ai_configured
    )


@router.get("/api/v1/health", response_model=HealthResponse)
async def api_health():
    """API versioned health check."""
    return await health()
