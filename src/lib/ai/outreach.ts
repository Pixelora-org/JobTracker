import { generateObject } from "ai";
import { z } from "zod";
import { captureModel } from "./model";
import type { Application } from "@/lib/types";

const outreachDraftSchema = z.object({
  connectionNote: z
    .string()
    .describe("LinkedIn connection note, at most 280 characters."),
  emailSubject: z.string().describe("Short, specific subject line. No emoji."),
  emailBody: z
    .string()
    .describe("Cold email body including a greeting and sign-off."),
});

export type OutreachDraft = z.infer<typeof outreachDraftSchema>;

const SYSTEM_PROMPT = `You write cold outreach for a job seeker contacting someone
at a company they applied to. You are writing as the applicant, in first person.

Voice:
- Direct and human. Short sentences. No corporate filler.
- Never open with "I hope this email finds you well" or "I am reaching out to".
- No flattery about how "innovative" or "exciting" the company is.
- No em dashes. No exclamation marks. No emoji.

Content:
- Name the exact role and company so it is obviously not a mass email.
- Give one concrete, specific reason this person should care, drawn only from
  the details provided. If the job description mentions a technology the
  applicant has worked with, reference it.
- Make one small, clear ask: a short chat, a referral, or pointing them to the
  right person. Never ask for a job outright.
- Mention that they already applied when that is true, so the reader can find
  the application.

Hard limits:
- connectionNote must be under 280 characters and must not repeat the email.
- emailBody must be under 130 words.
- Never invent facts about the applicant. Use only what the background provides.
  If the background is empty, keep claims about the applicant generic and true
  (that they applied and are interested), rather than inventing experience.
- Leave the applicant's name as "[Your name]" in the sign-off.`;

type DraftContext = {
  application: Application;
  contactName?: string | null;
  contactTitle?: string | null;
  /** Free-text background the user keeps about themselves. */
  about?: string | null;
  channel: "LinkedIn" | "Email";
};

export async function draftOutreach(
  context: DraftContext
): Promise<OutreachDraft> {
  const { application: app } = context;

  const details = [
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
    system: SYSTEM_PROMPT,
    prompt: `${details}

Applicant background (may be empty):
"""
${(context.about ?? "").slice(0, 2000)}
"""

Job description and notes the applicant saved (may be empty):
"""
${(app.notes ?? "").slice(0, 6000)}
"""`,
  });

  return {
    ...object,
    connectionNote: object.connectionNote.slice(0, 300),
  };
}
