"use server";

import { revalidatePath } from "next/cache";
import { isAiConfigured } from "@/lib/ai/model";
import {
  generateStrategyProposals,
  type StrategyProposal,
} from "@/lib/ai/strategy";
import {
  archiveStrategy,
  createStrategy,
} from "@/lib/data/strategies";
import { loadPlanningContext } from "@/lib/strategy/history";
import { consumeQuota } from "@/lib/quota";
import { friendlyDataError } from "@/lib/supabase/errors";
import { getUser } from "@/lib/supabase/server";
import type { StrategyInput } from "@/lib/types";

import type { ActionResult } from "@/lib/actions/result";

function message(e: unknown, fallback: string) {
  return friendlyDataError(e instanceof Error ? e.message : fallback);
}

export async function proposeStrategiesAction(input: {
  goalText: string;
  activeDays: number[];
  timezone: string;
}): Promise<ActionResult<StrategyProposal[]>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    if (!isAiConfigured) {
      return {
        ok: false,
        error:
          "Planning is off. Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local to enable it.",
      };
    }
    if (!input.goalText.trim()) {
      return { ok: false, error: "Describe what you are aiming for first." };
    }

    const quota = await consumeQuota("ai");
    if (!quota.ok) return quota;

    const context = await loadPlanningContext(input.timezone);

    const proposals = await generateStrategyProposals({
      goalText: input.goalText,
      grounded: context.grounded,
      averages: context.averages,
      funnel: context.funnel,
      totalApplications: context.totalApplications,
      activeDaysPerWeek: input.activeDays.length || 7,
    });

    return { ok: true, data: proposals };
  } catch (e) {
    return { ok: false, error: message(e, "Could not build a plan") };
  }
}

export async function createStrategyAction(
  input: StrategyInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };
    if (!input.name.trim()) {
      return { ok: false, error: "Give this strategy a name." };
    }
    if (!input.phases.length) {
      return { ok: false, error: "A strategy needs at least one target." };
    }

    const strategy = await createStrategy(input, user.id);
    revalidatePath("/strategy");
    revalidatePath("/board");
    return { ok: true, data: { id: strategy.id } };
  } catch (e) {
    return { ok: false, error: message(e, "Could not save the strategy") };
  }
}

export async function archiveStrategyAction(
  id: string
): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "You are signed out." };

    await archiveStrategy(id);
    revalidatePath("/strategy");
    revalidatePath("/board");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: message(e, "Could not archive the strategy") };
  }
}
