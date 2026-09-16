"""Search plan generation endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from app.models.search_plan import SearchPlanRequest, SearchPlan
from app.services.search_plan_service import SearchPlanService
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/search-plan", tags=["search-plan"])


@router.post("/generate", response_model=SearchPlan)
async def generate_search_plan(
    request: SearchPlanRequest,
    user_id: str = Depends(get_current_user)
) -> SearchPlan:
    """Generate a contact search plan.
    
    Analyzes a job application and generates:
    - Normalized company brand and domain
    - 4-6 personas worth contacting
    - LinkedIn and Google search queries
    
    This helps applicants find the right people to reach out to.
    """
    try:
        service = SearchPlanService()
        plan = await service.generate_plan(request)
        return plan
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate search plan: {str(e)}"
        )
