import { generateObject } from "ai";
import { z } from "zod";
import { captureModel } from "./model";
import type { Application } from "@/lib/types";

export const OUTREACH_TEMPLATES = ["recruiter", "teammate", "alum"] as const;
export type OutreachTemplate = (typeof OUTREACH_TEMPLATES)[number];

export const OUTREACH_TEMPLATE_LABELS: Record<OutreachTemplate, string> = {
  recruiter: "Recruiter",
  teammate: "Teammate",
  alum: "Alum",
};

const outreachDraftSchema = z.object({
  connectionNote: z
    .string()
    .describe(
      "LinkedIn connection note, 180-280 characters. One thought. Not a compressed email."
    ),
  emailSubject: z
    .string()
    .describe(
      "Subject only. 6-10 words. Role + company or a specific hook. No quotes, no Re:, no emoji."
    ),
  emailBody: z
    .string()
    .describe(
      "Plain-text email: greeting, three short paragraphs, sign-off. Use \\n\\n between paragraphs."
    ),
});

export type OutreachDraft = z.infer<typeof outreachDraftSchema>;

const TEMPLATE_RULES: Record<OutreachTemplate, string> = {
  recruiter: `You are writing to a recruiter or talent partner who likely owns this req.
- Mention that you already applied, with the date if one is given, so they can find the packet.
- Ask one process question: next step, whether they own this role, or who the hiring manager is.
- Do not ask a recruiter for a referral. Do not ask for a job.`,
  teammate: `You are writing to someone on the team, not recruiting.
- Open with one specific hook from the job or from the applicant background (a tool, a team problem, a product).
- Ask for a 15-minute chat or to be pointed at the right person.
- A referral can be mentioned only as something you would appreciate after a chat, never as the first ask.`,
  alum: `You are writing to someone who shares a school, program, or city with the applicant.
- Lead with the shared background in the first sentence if the background states one. If it does not, do not invent a school.
- Keep it warm and short. Still one concrete ask: 15 minutes, or the right person.
- Do not lean on "fellow [mascot]" energy or flattery.`,
};

const SYSTEM_PROMPT = `You write cold outreach for a job seeker. You write as the applicant, in first person.

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
- If they already applied, say so.`;

type DraftContext = {
  application: Application;
  contactName?: string | null;
  contactTitle?: string | null;
  about?: string | null;
  channel: "LinkedIn" | "Email";
  template: OutreachTemplate;
  applicantName: string;
};

export async function draftOutreach(
  context: DraftContext
): Promise<OutreachDraft> {
  const { application: app } = context;
  const applicantName = context.applicantName.trim() || "the applicant";

  const details = [
    `Applicant name (use this in the email sign-off): ${applicantName}`,
    `Template: ${context.template}`,
    `Company: ${app.company}`,
    `Role: ${app.role}`,
    `Track: ${app.track}`,
    `Application status: ${app.status}`,
    app.location ? `Location: ${app.location}` : null,
    app.workMode ? `Work mode: ${app.workMode}` : null,
    app.dateApplied ? `Applied on: ${app.dateApplied.slice(0, 10)}` : null,
    app.resumeVersion ? `Resume version sent: ${app.resumeVersion}` : null,
    context.contactName ? `Contact name: ${context.contactName}` : null,
    context.contactTitle ? `Contact title: ${context.contactTitle}` : null,
    `Preferred channel: ${context.channel}`,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: captureModel(),
    schema: outreachDraftSchema,
    schemaName: "OutreachDraft",
    schemaDescription:
      "A LinkedIn connection note and a cold email for a job applicant.",
    system: `${SYSTEM_PROMPT}

Template rules:
${TEMPLATE_RULES[context.template]}`,
    prompt: `${details}

Applicant background (may be empty — do not invent facts if it is):
"""
${(context.about ?? "").slice(0, 2000)}
"""

Job description and notes the applicant saved (may be empty):
"""
${(app.notes ?? "").slice(0, 6000)}
"""`,
  });

  return {
    emailSubject: object.emailSubject.replace(/^["']|["']$/g, "").trim(),
    emailBody: object.emailBody.trim(),
    connectionNote: object.connectionNote.trim().slice(0, 300),
  };
}
