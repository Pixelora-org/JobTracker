"""Tests for search plan generation endpoint."""

import pytest
from httpx import AsyncClient
from main import app


@pytest.fixture
def search_plan_request():
    """Sample search plan request."""
    return {
        "company": "Amazon Web Services",
        "role": "Security Engineering Intern",
        "track": "Internship",
        "location": "Seattle, WA",
        "notes": "Working on AWS security services. IAM, CloudTrail, and threat detection."
    }


@pytest.mark.asyncio
async def test_generate_search_plan_success(search_plan_request):
    """Test successful search plan generation."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/search-plan/generate",
            json=search_plan_request
        )
    
    assert response.status_code == 200
    data = response.json()
    
    # Check response structure
    assert "brand" in data
    assert "aliases" in data
    assert "linkedinSlug" in data
    assert "domain" in data
    assert "region" in data
    assert "personas" in data
    
    # Validate brand normalization
    assert data["brand"] in ["Amazon", "AWS"]
    
    # Check personas
    assert isinstance(data["personas"], list)
    assert len(data["personas"]) >= 4
    assert len(data["personas"]) <= 6
    
    # Validate persona structure
    for persona in data["personas"]:
        assert "label" in persona
        assert "why" in persona
        assert "titles" in persona
        assert "linkedinQuery" in persona
        assert "googleQuery" in persona
        
        # Titles should be lowercase
        for title in persona["titles"]:
            assert title == title.lower()


@pytest.mark.asyncio
async def test_generate_search_plan_campus_role(search_plan_request):
    """Test search plan for campus/intern role."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/search-plan/generate",
            json=search_plan_request
        )
    
    assert response.status_code == 200
    data = response.json()
    
    # For internship, should include university/campus recruiters
    persona_labels = [p["label"].lower() for p in data["personas"]]
    has_recruiter = any(
        "university" in label or "campus" in label or "recruit" in label
        for label in persona_labels
    )
    assert has_recruiter


@pytest.mark.asyncio
async def test_generate_search_plan_minimal():
    """Test search plan with minimal required fields."""
    minimal_request = {
        "company": "Startup Inc",
        "role": "Software Engineer",
        "track": "Full-time"
    }
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/search-plan/generate",
            json=minimal_request
        )
    
    assert response.status_code == 200
    data = response.json()
    assert "brand" in data
    assert len(data["personas"]) >= 4


@pytest.mark.asyncio
async def test_generate_search_plan_subsidiary():
    """Test brand normalization for subsidiary companies."""
    request = {
        "company": "Google Australia Pty Ltd",
        "role": "Software Engineer",
        "track": "Full-time",
        "location": "Sydney, Australia"
    }
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/search-plan/generate",
            json=request
        )
    
    assert response.status_code == 200
    data = response.json()
    
    # Should normalize to parent brand
    assert data["brand"] == "Google"


@pytest.mark.asyncio
async def test_generate_search_plan_missing_required():
    """Test search plan with missing required fields."""
    invalid_request = {
        "company": "Acme Corp"
        # Missing role and track
    }
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/search-plan/generate",
            json=invalid_request
        )
    
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_search_plan_linkedin_query_format(search_plan_request):
    """Test that LinkedIn queries are properly formatted."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/search-plan/generate",
            json=search_plan_request
        )
    
    assert response.status_code == 200
    data = response.json()
    
    # Validate LinkedIn query format (short, brand + title words)
    for persona in data["personas"]:
        query = persona["linkedinQuery"]
        # Should be relatively short (under 50 chars is reasonable)
        assert len(query) < 50
        # Should contain the brand
        assert data["brand"] in query or any(alias in query for alias in data["aliases"])
