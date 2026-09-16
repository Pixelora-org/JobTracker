"""
Pipeline AI Service

Dedicated Python service for LLM-powered features:
- Outreach message generation
- Search plan generation
- Future: Resume parsing, job description analysis, strategy recommendations
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import health, outreach, search_plan

app = FastAPI(
    title="Pipeline AI Service",
    description="LLM-powered features for job search automation",
    version="0.2.0"
)

# CORS middleware
allowed_origins = [
    origin.strip() 
    for origin in settings.cors_allowed_origins.split(",")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(outreach.router)
app.include_router(search_plan.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
