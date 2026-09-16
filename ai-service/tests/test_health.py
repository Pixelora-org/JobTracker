"""Tests for health check endpoints."""

import pytest
from httpx import AsyncClient
from main import app


@pytest.mark.asyncio
async def test_root_endpoint():
    """Test root endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "health" in data


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test health check endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "status" in data
    assert "version" in data
    assert "ai_configured" in data
    
    assert data["status"] == "healthy"
    assert isinstance(data["ai_configured"], bool)


@pytest.mark.asyncio
async def test_api_health_endpoint():
    """Test versioned API health check."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
