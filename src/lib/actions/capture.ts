"use server";

import { addDays } from "date-fns";
import { extractCapture } from "@/lib/ai/extract";
import { isAiConfigured } from "@/lib/ai/model";
import { DEFAULT_FOLLOW_UP_DAYS } from "@/lib/constants";
import { listApplications } from "@/lib/data/applications";
import { consumeQuota } from "@/lib/quota";
import { getUser } from "@/lib/supabase/server";
import type { ApplicationInput, TouchpointInput } from "@/lib/types";

export type CaptureDraft =
  | {
      kind: "application";
      values: Partial<ApplicationInput>;
      confidence: number;
    }
  | {
      kind: "touchpoint";
      values: Partial<TouchpointInput>;
      matchedCompany: string | null;
      confidence: number;
    };

type CaptureResult =
  | { ok: true; draft: CaptureDraft }
  | { ok: false; error: string };

function toIso(date: string | null) {
  if (!date) return undefined;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export async function captureAction(text: string): Promise<CaptureResult> {
  if (!text.trim()) {
    return { ok: false, error: "Paste something first." };
  }
  if (!isAiConfigured) {
    return {
      ok: false,
      error:
        "AI capture is not configured. Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local.",
    };
  }

  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };

    const quota = await consumeQuota("ai");
    if (!quota.ok) return quota;

    const applications = await listApplications();
    const extraction = await extractCapture(text, {
      applications: applications.map((a) => ({
        id: a.id,
        company: a.company,
        role: a.role,
        status: a.status,
      })),
    });

    if (extraction.kind === "application" && extraction.application) {
      const a = extraction.application;
      return {
        ok: true,
        draft: {
          kind: "application",
          confidence: extraction.confidence,
          values: {
            company: a.company ?? "",
            role: a.role ?? "",
            jobUrl: a.jobUrl ?? "",
            track: a.track ?? "Software Engineering",
            status: a.status ?? "Applied",
            source: a.source ?? "LinkedIn",
            location: a.location ?? "",
            workMode: a.workMode ?? "",
            resumeVersion: a.resumeVersion ?? "",
            dateApplied: a.dateApplied ?? new Date().toISOString().slice(0, 10),
            nextActionDate: a.nextActionDate ?? "",
            notes: a.notes ?? "",
          },
        },
      };
    }

    if (extraction.kind === "touchpoint" && extraction.touchpoint) {
      const t = extraction.touchpoint;
      const sentAt = toIso(t.date) ?? new Date().toISOString();

      // Explicit date wins, then "in N days", then the default interval.
      const followUp =
        toIso(t.followUpDate) ??
        addDays(
          new Date(sentAt),
          t.followUpInDays ?? DEFAULT_FOLLOW_UP_DAYS
        ).toISOString();

      const matched = applications.find((a) => a.id === t.matchedApplicationId);

      return {
        ok: true,
        draft: {
          kind: "touchpoint",
          confidence: extraction.confidence,
          matchedCompany: matched ? `${matched.company} · ${matched.role}` : null,
          values: {
            applicationId: matched?.id,
            contactName: t.contactName ?? "",
            company: t.company ?? matched?.company ?? "",
            channel: t.channel ?? "Email",
            type: t.type ?? "Cold outreach",
            status: t.status ?? "Sent",
            date: sentAt.slice(0, 10),
            followUpDate: followUp.slice(0, 10),
            notes: t.notes ?? "",
          },
        },
      };
    }

    return {
      ok: false,
      error:
        "Couldn't tell whether that's a job posting or outreach. Try pasting more of it, or fill the form manually.",
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Extraction failed";
    return { ok: false, error: detail };
  }
}
