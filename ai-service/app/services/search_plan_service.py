"""Service for generating search plans."""

from app.models.search_plan import SearchPlanRequest, SearchPlan
from app.services.gemini_client import GeminiClient


SYSTEM_PROMPT = """You plan how a job applicant should search for people to
contact about a specific role. You output search queries, not prose.

Normalizing the employer:
- "brand" is what employees type as their employer on LinkedIn. Strip legal
  suffixes such as Pty Ltd, Inc, LLC, GmbH, SA, BV, Limited.
- If the entity is a local subsidiary or hiring entity of a well known parent,
  use the parent brand people actually use. "Amazon Support Services Pty Ltd"
  becomes "Amazon". "Google Australia Pty Ltd" becomes "Google".
- "aliases" holds other names worth trying, such as a division or a former name.
- "domain" is the main corporate domain people get email at, not a careers
  subdomain and not an applicant tracking system.

Choosing personas (4 to 6, best response rate first):
- Match them to the actual seniority of the role. An internship, graduate,
  new grad, or campus role is filled by university recruiters, campus
  recruiters, and early careers talent partners. A senior role is filled by
  technical recruiters and the engineering manager who owns the req.
- "why" must be specific to this posting. Bad: "Good person to contact."
  Good: "Owns the university recruiting pipeline for security interns."
- Include at least one recruiter persona and at least one persona on the team
  itself, since teammates give referrals that recruiters cannot.
- Use the real job titles that exist at this kind of employer. Large tech
  companies use "University Recruiter" and "Sourcer"; startups use
  "Head of Talent" or "Founding Engineer". Do not invent titles.
- "titles" feeds a contact database filter that matches job titles literally,
  so give plain titles a person would have on a business card. Lowercase, no
  boolean operators, no company name, no location.

Writing linkedinQuery:
- LinkedIn matches keywords against the whole profile and free accounts limit
  how many boolean operators a query accepts, so keep it SHORT.
- Format: brand followed by one or two title words. Six words maximum.
- Use at most one OR, and only when two title wordings are both common.
- Write OR in uppercase. Never use parentheses. Never quote the brand name.
- LinkedIn matches location too, so append the city for personas where being
  local matters: teammates, hiring managers, and regional recruiters. Skip the
  city for global or headquarters roles such as university recruiting programs
  that hire across a whole country.
- Good: Amazon university recruiter
- Good: Amazon software engineer Brisbane
- Bad: "Amazon Support Services Pty Ltd" (recruiter OR "talent acquisition")

Writing googleQuery:
- Google handles heavy boolean well, so use quoted title phrases joined by OR
  inside parentheses, plus the brand and the region when one is known.
- Do not include site: or any URL. That gets added separately.
- Good: ("university recruiter" OR "campus recruiter") Amazon Australia"""


class SearchPlanService:
    """Service for generating contact search plans."""
    
    def __init__(self):
        self.client = GeminiClient()
    
    async def generate_plan(self, request: SearchPlanRequest) -> SearchPlan:
        """Generate a search plan for finding contacts.
        
        Args:
            request: Search plan request with company and role info
            
        Returns:
            Generated search plan with personas and queries
        """
        # Build the prompt
        prompt_parts = [
            f"Company as written on the application: {request.company}",
            f"Role: {request.role}",
            f"Track: {request.track}",
        ]
        
        if request.location:
            prompt_parts.append(f"Location: {request.location}")
        else:
            prompt_parts.append("Location: not given")
        
        if request.jobUrl:
            prompt_parts.append(f"Job posting URL: {request.jobUrl}")
        
        prompt_parts.append("\nJob description and notes the applicant saved (may be empty):")
        prompt_parts.append('"""')
        
        notes = (request.notes or "").strip()[:6000]
        prompt_parts.append(notes)
        prompt_parts.append('"""')
        
        user_prompt = "\n".join(prompt_parts)
        
        # Generate the plan
        plan = await self.client.generate_object(
            schema=SearchPlan,
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.7
        )
        
        return plan
