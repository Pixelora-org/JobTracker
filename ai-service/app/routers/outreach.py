"""Outreach draft generation endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from app.models.outreach import OutreachDraftRequest, OutreachDraft
from app.services.outreach_service import OutreachService
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/outreach", tags=["outreach"])


@router.post("/draft", response_model=OutreachDraft)
async def draft_outreach(
    request: OutreachDraftRequest,
    user_id: str = Depends(get_current_user)
) -> OutreachDraft:
    """Generate a cold outreach draft (LinkedIn note + email).
    
    This endpoint generates personalized outreach messages based on:
    - Application context (company, role, status)
    - Contact profile (name, title, LinkedIn)
    - Applicant background
    - Template type (recruiter, teammate, alum)
    
    Returns a LinkedIn connection note and cold email draft.
    """
    try:
        service = OutreachService()
        draft = await service.generate_draft(request)
        return draft
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate outreach draft: {str(e)}"
        )
