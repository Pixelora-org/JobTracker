import { generateObject } from "ai";
import { z } from "zod";
import { captureModel } from "./model";

const paramsSchema = z.object({
  query: z
    .string()
    .describe("Short job search query: titles and keywords, no sentences."),
  location: z.string().describe("City, region, or empty if remote/anywhere."),
  country: z
    .string()
    .describe(
      "ISO country for Adzuna: us, gb, ca, au, in, de, fr, or similar. Default us. Never uk (use gb)."
    ),
});

type JobSearchParams = z.infer<typeof paramsSchema>;

export async function jobSearchParamsFromProfile(input: {
  goalText?: string;
  resumeLabel?: string;
  resumeNotes?: string;
  titles?: string;
  location?: string;
}): Promise<JobSearchParams> {
  const { object } = await generateObject({
    model: captureModel(),
    schema: paramsSchema,
    prompt: `Turn this job-seeker profile into a jobs-board search.

Goal: ${input.goalText || "(none)"}
Resume version: ${input.resumeLabel || "(none)"}
Resume notes: ${input.resumeNotes || "(none)"}
Titles they typed: ${input.titles || "(none)"}
Location they typed: ${input.location || "(none)"}

Rules:
- query is what you would type into LinkedIn or Indeed. Example: "security intern" or "software engineer intern python".
- Prefer intern / new-grad wording if the goal mentions internships.
- If they typed titles, use those as the backbone of query.
- country is a 2-letter Adzuna code. Default us. Use gb not uk.
- location is a city/region, or empty if remote/anywhere.`,
  });
  return object;
}
