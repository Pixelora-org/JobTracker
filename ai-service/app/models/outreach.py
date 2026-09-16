"""Models for outreach draft generation."""

from pydantic import BaseModel, Field
from typing import Optional, Literal


class ContactProfile(BaseModel):
    """Contact information for generating personalized outreach."""
    name: str
    title: Optional[str] = None
    company: Optional[str] = None
    linkedinUrl: Optional[str] = Field(None, alias="linkedinUrl")
    headline: Optional[str] = None
    school: Optional[str] = None

    class Config:
        populate_by_name = True


class ApplicationContext(BaseModel):
    """Application context for outreach generation."""
    company: str
    role: str
    track: str
    status: str
    location: Optional[str] = None
    workMode: Optional[str] = Field(None, alias="workMode")
    dateApplied: Optional[str] = Field(None, alias="dateApplied")
    resumeVersion: Optional[str] = Field(None, alias="resumeVersion")
    notes: Optional[str] = None

    class Config:
        populate_by_name = True


class OutreachDraftRequest(BaseModel):
    """Request payload for generating outreach drafts."""
    application: ApplicationContext
    contactProfile: Optional[ContactProfile] = Field(None, alias="contactProfile")
    contactName: Optional[str] = Field(None, alias="contactName")
    contactTitle: Optional[str] = Field(None, alias="contactTitle")
    about: Optional[str] = None
    channel: Literal["LinkedIn", "Email"]
    template: Literal["recruiter", "teammate", "alum"]
    applicantName: str = Field(..., alias="applicantName")

    class Config:
        populate_by_name = True


class OutreachDraft(BaseModel):
    """Generated outreach draft with LinkedIn note and email."""
    connectionNote: str = Field(
        ...,
        description="LinkedIn connection note, 180-280 characters",
        alias="connectionNote"
    )
    emailSubject: str = Field(
        ...,
        description="Email subject line, 6-10 words",
        alias="emailSubject"
    )
    emailBody: str = Field(
        ...,
        description="Plain-text email body",
        alias="emailBody"
    )

    class Config:
        populate_by_name = True
