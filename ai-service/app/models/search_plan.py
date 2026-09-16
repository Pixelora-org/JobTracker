"""Models for search plan generation."""

from pydantic import BaseModel, Field
from typing import Optional, List


class Persona(BaseModel):
    """A persona representing a type of person to contact."""
    label: str = Field(..., description='Short plural label, e.g. "University recruiters"')
    why: str = Field(..., description="Specific reason to contact this persona for THIS role")
    titles: List[str] = Field(..., description="2-4 exact job titles for contact filters")
    linkedinQuery: str = Field(
        ...,
        alias="linkedinQuery",
        description="Simple LinkedIn keyword query"
    )
    googleQuery: str = Field(
        ...,
        alias="googleQuery",
        description="Rich boolean query for Google"
    )

    class Config:
        populate_by_name = True


class SearchPlan(BaseModel):
    """Complete search plan for finding contacts at a company."""
    brand: str = Field(..., description="Employer name people use on LinkedIn")
    aliases: List[str] = Field(..., description="Other names for the same employer")
    linkedinSlug: str = Field(
        ...,
        alias="linkedinSlug",
        description="Best guess at linkedin.com/company/<slug>"
    )
    domain: str = Field(..., description="Primary corporate domain")
    region: Optional[str] = Field(None, description="City and country, or null")
    personas: List[Persona] = Field(..., description="4-6 personas to contact")

    class Config:
        populate_by_name = True


class SearchPlanRequest(BaseModel):
    """Request payload for generating a search plan."""
    company: str
    role: str
    track: str
    location: Optional[str] = None
    jobUrl: Optional[str] = Field(None, alias="jobUrl")
    notes: Optional[str] = None

    class Config:
        populate_by_name = True
