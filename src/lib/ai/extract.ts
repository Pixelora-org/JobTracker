import { generateObject } from "ai";
import { captureModel } from "./model";
import { captureSchema, type CaptureExtraction } from "./schemas";
import type { Application } from "@/lib/types";

const SYSTEM_PROMPT = `You turn pasted text into structured job-search records.

Decide what the text is:
- "application" when it is a job posting, job description, or role listing.
- "touchpoint" when it is outreach the user sent or received: a cold email, a
  LinkedIn message or connection note, a referral ask, a recruiter reply, or
  just a contact name and email address.
- "unknown" when it is neither.

Rules:
- Only fill a field if the text supports it. Use null instead of guessing.
- Never invent a company or person's name.
- Map to the allowed enum values; if nothing fits, use null.
- Treat text written in first person about reaching out ("I emailed",
  "sent a connection request", "dropped a cold email") as a touchpoint.
- Pull email addresses and LinkedIn URLs out of signatures and headers.
- For a job posting, default status to "Applied" and pick the source from how
  the posting is described (LinkedIn, company site, referral, etc).
- Classify track as Cybersecurity for security, appsec, SOC, GRC, or offensive
  security roles; Software Engineering for general engineering roles.
- Interpret relative dates against the provided current date.`;

type ExtractContext = {
  applications: Pick<Application, "id" | "company" | "role" | "status">[];
};

export async function extractCapture(
  text: string,
  context: ExtractContext
): Promise<CaptureExtraction> {
  const applicationList = context.applications.length
    ? context.applications
        .map((a) => `- id=${a.id} | ${a.company} | ${a.role} | ${a.status}`)
        .join("\n")
    : "(none yet)";

  const { object } = await generateObject({
    model: captureModel(),
    schema: captureSchema,
    schemaName: "JobSearchCapture",
    schemaDescription:
      "Structured job application or outreach record extracted from pasted text.",
    system: SYSTEM_PROMPT,
    prompt: `Current date: ${new Date().toISOString().slice(0, 10)}

The user's existing applications (use these ids for matchedApplicationId):
${applicationList}

Pasted text:
"""
${text.slice(0, 12000)}
"""`,
  });

  return object;
}
