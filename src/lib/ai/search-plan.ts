import { generateObject } from "ai";
import { z } from "zod";
import { captureModel } from "./model";
import type { Application, SearchPlan } from "@/lib/types";

const personaSchema = z.object({
  label: z.string().describe('Short plural label, e.g. "University recruiters".'),
  why: z.string().describe("One short line on why this person is worth contacting."),
  titles: z
    .array(z.string())
    .describe(
      "Two to four exact job titles for a contact database filter, lowercase."
    ),
  linkedinQuery: z
    .string()
    .describe(
      "Simple LinkedIn keyword query. Brand plus one or two title words. At most one OR."
    ),
  googleQuery: z
    .string()
    .describe(
      "Rich boolean query for Google, without any site: prefix. Quoted title phrases joined by OR."
    ),
});

export const searchPlanSchema = z.object({
  brand: z
    .string()
    .describe("The employer name people actually put on their LinkedIn profile."),
  aliases: z
    .array(z.string())
    .describe("Other names for the same employer, most useful first."),
  linkedinSlug: z
    .string()
    .describe("Best guess at the linkedin.com/company/<slug> path segment."),
  domain: z.string().describe("The employer's primary corporate domain."),
  region: z
    .string()
    .nullable()
    .describe("City and country to bias searches toward, or null."),
  personas: z.array(personaSchema),
});

const SYSTEM_PROMPT = `You plan how a job applicant should search for people to
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
- Good: ("university recruiter" OR "campus recruiter") Amazon Australia`;

export async function generateSearchPlan(
  application: Application
): Promise<SearchPlan> {
  const app = application;

  const { object } = await generateObject({
    model: captureModel(),
    schema: searchPlanSchema,
    schemaName: "PeopleSearchPlan",
    schemaDescription:
      "Normalized employer identity and the people worth contacting about a role.",
    system: SYSTEM_PROMPT,
    prompt: `Company as written on the application: ${app.company}
Role: ${app.role}
Track: ${app.track}
${app.location ? `Location: ${app.location}` : "Location: not given"}
${app.jobUrl ? `Job posting URL: ${app.jobUrl}` : ""}

Job description and notes the applicant saved (may be empty):
"""
${(app.notes ?? "").slice(0, 6000)}
"""`,
  });

  return object;
}
