"use server";

import { isAiConfigured } from "@/lib/ai/model";
import { draftOutreach, type OutreachDraft } from "@/lib/ai/outreach";
import { generateSearchPlan } from "@/lib/ai/search-plan";
import { getApplication, saveSearchPlan } from "@/lib/data/applications";
import { getUser } from "@/lib/supabase/server";
import { consumeQuota } from "@/lib/quota";
import type { SearchPlan } from "@/lib/types";
import {
  findContacts,
  isApolloConfigured,
  revealContact,
  type ContactSearch,
  type OutreachContact,
} from "@/lib/outreach/apollo";

import type { ActionResult } from "@/lib/actions/result";

function message(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

/**
 * Works out who to contact at this employer and how to search for them, then
 * caches it on the application so later visits are instant.
 */
export async function searchPlanAction(
  applicationId: string,
  opts?: { refresh?: boolean }
): Promise<ActionResult<SearchPlan>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    if (!isAiConfigured) {
      return {
        ok: false,
        error:
          "Smart search is off. Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local to enable it.",
      };
    }

    const application = await getApplication(applicationId);
    if (!application) return { ok: false, error: "Application not found." };
    if (application.searchPlan && !opts?.refresh) {
      return { ok: true, data: application.searchPlan };
    }

    const quota = await consumeQuota("ai");
    if (!quota.ok) return quota;

    const plan = await generateSearchPlan(application);
    await saveSearchPlan(applicationId, plan);

    return { ok: true, data: plan };
  } catch (e) {
    return { ok: false, error: message(e, "Could not plan the search") };
  }
}

const APOLLO_OFF =
  "Contact lookup is off. Add APOLLO_API_KEY to .env.local to enable it.";

export async function findContactsAction(
  domain: string,
  titles: string[]
): Promise<ActionResult<ContactSearch>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    if (!isApolloConfigured) return { ok: false, error: APOLLO_OFF };

    const data = await findContacts(domain, titles);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: message(e, "Contact lookup failed") };
  }
}

/** Spends one Apollo credit to unmask a single person's email. */
export async function revealContactAction(
  personId: string
): Promise<ActionResult<Partial<OutreachContact>>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    if (!isApolloConfigured) return { ok: false, error: APOLLO_OFF };

    const quota = await consumeQuota("apollo");
    if (!quota.ok) return quota;

    const data = await revealContact(personId);
    if (!data.email) {
      return { ok: false, error: "Apollo has no email on file for them." };
    }

    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: message(e, "Reveal failed") };
  }
}

export async function draftOutreachAction(input: {
  applicationId: string;
  contactName?: string;
  contactTitle?: string;
  about?: string;
  channel: "LinkedIn" | "Email";
}): Promise<ActionResult<OutreachDraft>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    if (!isAiConfigured) {
      return {
        ok: false,
        error:
          "Drafting is off. Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local to enable it.",
      };
    }

    // Read the application server-side so the draft can't be pointed at
    // someone else's record.
    const application = await getApplication(input.applicationId);
    if (!application) return { ok: false, error: "Application not found." };

    const quota = await consumeQuota("ai");
    if (!quota.ok) return quota;

    const draft = await draftOutreach({
      application,
      contactName: input.contactName,
      contactTitle: input.contactTitle,
      about: input.about,
      channel: input.channel,
    });

    return { ok: true, data: draft };
  } catch (e) {
    return { ok: false, error: message(e, "Could not draft outreach") };
  }
}
