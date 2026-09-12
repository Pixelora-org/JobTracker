"""
Pipeline AI Service

Dedicated Python service for LLM-powered features:
- Outreach message generation
- Resume parsing and extraction
- Job description analysis
- Search plan generation
- Strategy recommendations
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import Optional

app = FastAPI(
    title="Pipeline AI Service",
    description="LLM-powered features for job search automation",
    version="0.1.0"
)

allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    version: str
    ai_configured: bool


@app.get("/")
async def root():
    """Root endpoint redirects to health check."""
    return {"message": "Pipeline AI Service", "health": "/health"}


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint for Railway and monitoring."""
    ai_key = os.getenv("GOOGLE_GENERATIVE_AI_API_KEY")
    
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        ai_configured=bool(ai_key)
    )


@app.get("/api/v1/health", response_model=HealthResponse)
async def api_health():
    """API versioned health check."""
    return await health()


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
