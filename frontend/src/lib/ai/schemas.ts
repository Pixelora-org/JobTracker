import { z } from "zod";
import {
  CHANNELS,
  SOURCES,
  STATUSES,
  TOUCHPOINT_STATUSES,
  TOUCHPOINT_TYPES,
  TRACKS,
  WORK_MODES,
} from "@/lib/types";

/**
 * Every enum here mirrors the database check constraints, so the model can only
 * produce values the schema already accepts. Unknown fields come back null and
 * are left blank for the user rather than guessed.
 */
const isoDate = z
  .string()
  .nullable()
  .describe("Date as YYYY-MM-DD, or null if not stated");

export const captureSchema = z.object({
  kind: z
    .enum(["application", "touchpoint", "unknown"])
    .describe(
      "application = a job posting or role description. touchpoint = an outreach message, cold email, LinkedIn note, or a bare contact/email address. unknown = neither."
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("How confident you are in the classification"),
  application: z
    .object({
      company: z.string().nullable(),
      role: z.string().nullable(),
      jobUrl: z.string().nullable(),
      track: z.enum(TRACKS).nullable(),
      status: z.enum(STATUSES).nullable(),
      source: z.enum(SOURCES).nullable(),
      location: z.string().nullable(),
      workMode: z.enum(WORK_MODES).nullable(),
      resumeVersion: z.string().nullable(),
      dateApplied: isoDate,
      nextActionDate: isoDate,
      notes: z
        .string()
        .nullable()
        .describe(
          "A short brief, 4-6 lines max, not the posting. Cover what is stated: team/org, stack or tools, seniority, location or visa, compensation if given, and one specific hook for outreach. No filler, no 'exciting opportunity'."
        ),
    })
    .nullable(),
  touchpoint: z
    .object({
      contactName: z.string().nullable(),
      company: z.string().nullable(),
      channel: z.enum(CHANNELS).nullable(),
      type: z.enum(TOUCHPOINT_TYPES).nullable(),
      status: z.enum(TOUCHPOINT_STATUSES).nullable(),
      date: isoDate.describe("Date the outreach was sent, YYYY-MM-DD, or null"),
      followUpDate: isoDate.describe(
        "Explicit follow-up or reminder date the user asked for, YYYY-MM-DD, or null"
      ),
      followUpInDays: z
        .number()
        .int()
        .nullable()
        .describe(
          "If the user said 'remind me in N days' without a date, the number of days"
        ),
      matchedApplicationId: z
        .string()
        .nullable()
        .describe(
          "The id of the existing application this outreach belongs to, chosen only from the provided list. Null if none clearly match."
        ),
      notes: z.string().nullable(),
      contactEmail: z
        .string()
        .nullable()
        .describe("Email address if present in the paste or signature"),
      contactTitle: z.string().nullable(),
      contactLinkedinUrl: z
        .string()
        .nullable()
        .describe("LinkedIn profile URL if present"),
    })
    .nullable(),
});

export type CaptureExtraction = z.infer<typeof captureSchema>;
