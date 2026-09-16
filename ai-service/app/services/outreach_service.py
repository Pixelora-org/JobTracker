"""Service for generating outreach drafts."""

from app.models.outreach import OutreachDraftRequest, OutreachDraft
from app.services.gemini_client import GeminiClient


TEMPLATE_RULES = {
    "recruiter": """You are writing to a recruiter or talent partner who likely owns this req.
- Mention that you already applied, with the date if one is given, so they can find the packet.
- Ask one process question: next step, whether they own this role, or who the hiring manager is.
- Do not ask a recruiter for a referral. Do not ask for a job.""",
    
    "teammate": """You are writing to someone on the team, not recruiting.
- Open with one specific hook from the job or from the applicant background (a tool, a team problem, a product).
- Ask for a 15-minute chat or to be pointed at the right person.
- A referral can be mentioned only as something you would appreciate after a chat, never as the first ask.""",
    
    "alum": """You are writing to someone who shares a school, program, or city with the applicant.
- Lead with the shared background in the first sentence if the background states one. If it does not, do not invent a school.
- Keep it warm and short. Still one concrete ask: 15 minutes, or the right person.
- Do not lean on "fellow [mascot]" energy or flattery."""
}


SYSTEM_PROMPT = """You write cold outreach for a job seeker. You write as the applicant, in first person.

Voice:
- Short, senior, specific. Read like a strong intern or new grad, not a template mill.
- Never open with "I hope this email finds you well", "I am reaching out", "my name is", or "I came across your profile".
- No flattery about how innovative or exciting the company is.
- No em dashes. No exclamation marks. No emoji. No hashtags.

Email format (required):
Hi {FirstName},

{Paragraph 1: why this person, this role, this company. One or two sentences.}

{Paragraph 2: one proof point from the applicant background or the job. One or two sentences. If background is empty, say only that you applied and what you are targeting. Do not invent internships, skills, or schools.}

{Paragraph 3: one small ask. One sentence.}

{Applicant full name}
{One optional line: school or target, only if the background provides it}

Hard limits:
- emailBody is 70-120 words. Three paragraphs plus greeting and sign-off.
- Separate paragraphs with a blank line.
- Use the contact's first name in the greeting when you have a full name. If the name is missing, use "Hi,".
- Sign off with the applicant's real name. Never write [Your name] or a placeholder.
- emailSubject is a subject line only. Never repeat it inside the body.

LinkedIn connection note:
- 180-280 characters. One sentence of context plus one ask to connect.
- Must not be the email shortened. No greeting block, no sign-off, no "best,".
- Name the role. Do not paste a paragraph.

Facts:
- Use only the details provided. If a field is missing, skip it.
- Name the exact role and company.
- If they already applied, say so."""


class OutreachService:
    """Service for generating outreach message drafts."""
    
    def __init__(self):
        self.client = GeminiClient()
    
    async def generate_draft(self, request: OutreachDraftRequest) -> OutreachDraft:
        """Generate a cold outreach draft (LinkedIn note + email).
        
        Args:
            request: Outreach draft request with application and contact info
            
        Returns:
            Generated outreach draft
        """
        app = request.application
        contact_profile = request.contactProfile
        applicant_name = request.applicantName.strip() or "the applicant"
        
        contact_name = (
            contact_profile.name if contact_profile 
            else request.contactName
        ) or None
        
        contact_title = (
            contact_profile.title if contact_profile
            else request.contactTitle
        ) or None
        
        # Build context details
        details_parts = [
            f"Applicant name (use this in the email sign-off): {applicant_name}",
            f"Template: {request.template}",
            f"Company: {app.company}",
            f"Role: {app.role}",
            f"Track: {app.track}",
            f"Application status: {app.status}",
        ]
        
        if app.location:
            details_parts.append(f"Location: {app.location}")
        if app.workMode:
            details_parts.append(f"Work mode: {app.workMode}")
        if app.dateApplied:
            details_parts.append(f"Applied on: {app.dateApplied[:10]}")
        if app.resumeVersion:
            details_parts.append(f"Resume version sent: {app.resumeVersion}")
        if contact_name:
            details_parts.append(f"Contact name: {contact_name}")
        if contact_title:
            details_parts.append(f"Contact title: {contact_title}")
        if contact_profile and contact_profile.headline:
            details_parts.append(f"Contact headline: {contact_profile.headline}")
        if contact_profile and contact_profile.school:
            details_parts.append(f"Contact school: {contact_profile.school}")
        if contact_profile and contact_profile.linkedinUrl:
            details_parts.append(f"Contact LinkedIn: {contact_profile.linkedinUrl}")
        
        details_parts.append(f"Preferred channel: {request.channel}")
        
        details = "\n".join(details_parts)
        
        # Build the complete prompt
        system_with_rules = f"""{SYSTEM_PROMPT}

Template rules:
{TEMPLATE_RULES[request.template]}"""
        
        about_text = (request.about or "").strip()[:2000]
        notes_text = (app.notes or "").strip()[:6000]
        
        user_prompt = f"""{details}

Applicant background (may be empty — do not invent facts if it is):
\"\"\"
{about_text}
\"\"\"

Job description and notes the applicant saved (may be empty):
\"\"\"
{notes_text}
\"\"\""""
        
        # Generate the draft
        draft = await self.client.generate_object(
            schema=OutreachDraft,
            system_prompt=system_with_rules,
            user_prompt=user_prompt,
            temperature=0.7
        )
        
        # Clean up output
        draft.emailSubject = draft.emailSubject.strip().strip('"').strip("'")
        draft.emailBody = draft.emailBody.strip()
        draft.connectionNote = draft.connectionNote.strip()[:300]
        
        return draft
