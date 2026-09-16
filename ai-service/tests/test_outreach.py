"""Tests for outreach draft generation endpoint."""

import pytest
from httpx import AsyncClient
from main import app


@pytest.fixture
def outreach_request():
    """Sample outreach draft request."""
    return {
        "application": {
            "company": "Acme Corp",
            "role": "Software Engineering Intern",
            "track": "Internship",
            "status": "Applied",
            "location": "San Francisco, CA",
            "workMode": "Hybrid",
            "dateApplied": "2026-09-01",
            "notes": "Building security tools for cloud infrastructure. Python and Go stack."
        },
        "contactProfile": {
            "name": "Jane Smith",
            "title": "University Recruiter",
            "company": "Acme Corp"
        },
        "about": "CS junior at MIT, security research assistant, built a SIEM detection pipeline in Python",
        "channel": "Email",
        "template": "recruiter",
        "applicantName": "John Doe"
    }


@pytest.mark.asyncio
async def test_draft_outreach_success(outreach_request):
    """Test successful outreach draft generation."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/outreach/draft",
            json=outreach_request
        )
    
    assert response.status_code == 200
    data = response.json()
    
    # Check response structure
    assert "connectionNote" in data
    assert "emailSubject" in data
    assert "emailBody" in data
    
    # Validate field constraints
    assert len(data["connectionNote"]) >= 180
    assert len(data["connectionNote"]) <= 300
    assert len(data["emailSubject"]) > 0
    assert len(data["emailBody"]) > 0
    
    # Check that applicant name appears in email body
    assert "John Doe" in data["emailBody"]
    
    # Check that company is mentioned
    assert "Acme" in data["emailBody"] or "Acme Corp" in data["emailBody"]


@pytest.mark.asyncio
async def test_draft_outreach_linkedin_channel(outreach_request):
    """Test outreach draft for LinkedIn channel."""
    outreach_request["channel"] = "LinkedIn"
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/outreach/draft",
            json=outreach_request
        )
    
    assert response.status_code == 200
    data = response.json()
    
    # LinkedIn note should be shorter and mention the role
    assert len(data["connectionNote"]) >= 180
    assert len(data["connectionNote"]) <= 300


@pytest.mark.asyncio
async def test_draft_outreach_teammate_template(outreach_request):
    """Test outreach draft with teammate template."""
    outreach_request["template"] = "teammate"
    outreach_request["contactProfile"]["title"] = "Senior Software Engineer"
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/outreach/draft",
            json=outreach_request
        )
    
    assert response.status_code == 200
    data = response.json()
    assert "emailBody" in data


@pytest.mark.asyncio
async def test_draft_outreach_minimal_context(outreach_request):
    """Test outreach draft with minimal context."""
    # Remove optional fields
    outreach_request["application"]["notes"] = None
    outreach_request["about"] = None
    outreach_request["contactProfile"] = None
    outreach_request["contactName"] = "Jane"
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/outreach/draft",
            json=outreach_request
        )
    
    # Should still succeed with minimal context
    assert response.status_code == 200
    data = response.json()
    assert "emailBody" in data


@pytest.mark.asyncio
async def test_draft_outreach_missing_required_field():
    """Test outreach draft with missing required fields."""
    invalid_request = {
        "application": {
            "company": "Acme Corp",
            "role": "Engineer",
            # Missing required fields
        },
        "channel": "Email",
        "template": "recruiter"
        # Missing applicantName
    }
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/outreach/draft",
            json=invalid_request
        )
    
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_draft_outreach_invalid_template():
    """Test outreach draft with invalid template."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/outreach/draft",
            json={
                "application": {
                    "company": "Acme",
                    "role": "Engineer",
                    "track": "Internship",
                    "status": "Applied"
                },
                "channel": "Email",
                "template": "invalid_template",
                "applicantName": "John Doe"
            }
        )
    
    assert response.status_code == 422  # Validation error
