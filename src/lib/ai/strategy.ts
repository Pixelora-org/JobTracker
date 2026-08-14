import { generateObject } from "ai";
import { z } from "zod";
import { captureModel } from "./model";
import {
  METRIC_LABELS,
  METRIC_MINUTES,
  STRATEGY_METRICS,
  type StrategyMetric,
  type StrategyPhase,
} from "@/lib/types";

const targetSchema = z.object({
  metric: z.enum(STRATEGY_METRICS),
  count: z.number().int().min(0).max(200),
  period: z.enum(["day", "week"]),
});

const phaseSchema = z.object({
  label: z.string().describe('Short phase name, e.g. "Ramp-up" or "Full pace".'),
  weeks: z
    .number()
    .int()
    .min(1)
    .max(12)
    .nullable()
    .describe("How many weeks this phase lasts. Null means it runs to the end."),
  targets: z.array(targetSchema),
});

const proposalSchema = z.object({
  name: z.string().describe('Short plan name, e.g. "Steady build".'),
  philosophy: z.string().describe("One line on the trade-off this plan makes."),
  phases: z.array(phaseSchema),
  rationale: z
    .string()
    .describe("Two or three sentences justifying the numbers from their data."),
  risk: z.string().describe("One line on where this plan is likely to break."),
});

const strategyProposalsSchema = z.object({
  proposals: z.array(proposalSchema),
});

export type StrategyProposal = z.infer<typeof proposalSchema> & {
  phases: StrategyPhase[];
};

const BASE_PROMPT = `You design job search activity plans. You output daily and
weekly activity targets, not advice on resumes or interviews.

You must return exactly three proposals, ordered from lightest to heaviest
workload. They must be genuinely different in intensity, not the same numbers
with different names.

Available metrics and what each one costs:
${STRATEGY_METRICS.map(
  (m) => `- ${m} (${METRIC_LABELS[m as StrategyMetric]}): about ${METRIC_MINUTES[m as StrategyMetric]} minutes each`
).join("\n")}

Rules for targets:
- Only include metrics the plan actually asks for. Leave the rest out entirely.
- Use period "day" for things done every working day, such as applications.
- Use period "week" for lower volume work such as referral asks, where a daily
  number would round to something silly.
- Respect the time budget the applicant states. Multiply each target by the
  minutes above and keep the daily total inside their budget. A plan that
  quietly demands six hours a day is a failed plan. If what they ask for does
  not fit the time they have, say so plainly in the rationale.
- The final phase must always have weeks set to null.
- Applications without outreach is the most common failure, so every plan should
  include some outreach unless the applicant explicitly rules it out.

Rules for the writing:
- "risk" names the specific thing that will break first, such as email quality
  dropping at high volume, or the plan assuming weekends stay free.`;

/** Enough logged activity that their averages mean something. */
const GROUNDED_PROMPT = `${BASE_PROMPT}

Using their history:
- Ground the numbers in their recent averages. If they ask for a number far
  above what they have been doing, use phases to ramp toward it rather than
  starting at the top: an early phase at a reachable number, then a later phase
  at the target.
- If their recent average is already near the request, a single phase with
  weeks null is correct. Do not invent a ramp that is not needed.
- "rationale" must cite their actual numbers, such as their current average or
  their screen rate. Never write generic encouragement.`;

/**
 * Too little history to infer capacity. A near-zero average here means they
 * just started tracking, not that they cannot work, so it must not cap targets.
 */
const AMBITION_PROMPT = `${BASE_PROMPT}

This applicant has only just started tracking:
- You have no reliable history for them. Do not lower their targets on the
  assumption that they cannot do more, and do not mention past averages.
- Build the plans around the targets they state. The middle proposal should
  match what they asked for as closely as the time budget allows.
- The lightest proposal is a sustainable version for a bad week. The heaviest
  pushes past their ask only if their stated time budget genuinely allows it.
- Ramp phases are still welcome when the ask is demanding, but frame them as
  building a habit rather than as a limit on what they can handle.
- "rationale" must justify the numbers from the time budget arithmetic and the
  outcome they want. Never write generic encouragement.`;

type StrategyContext = {
  goalText: string;
  grounded: boolean;
  averages: Record<StrategyMetric, number>;
  funnel: {
    applied: number;
    screen: number;
    interview: number;
    offer: number;
    toScreen: number | null;
    toInterview: number | null;
  };
  totalApplications: number;
  activeDaysPerWeek: number;
};

export async function generateStrategyProposals(context: StrategyContext) {
  const averages = STRATEGY_METRICS.map(
    (m) => `- ${METRIC_LABELS[m]}: ${context.averages[m]} per day`
  ).join("\n");

  const history = context.grounded
    ? `Their actual activity over the last 14 days, per calendar day:
${averages}

Their pipeline right now:
- ${context.totalApplications} applications tracked in total
- ${context.funnel.applied} at applied or assessment stage
- ${context.funnel.screen} at phone screen
- ${context.funnel.interview} at interview
- ${context.funnel.offer} at offer
- Applied to screen rate: ${context.funnel.toScreen === null ? "not enough data" : `${context.funnel.toScreen}%`}
- Screen to interview rate: ${context.funnel.toInterview === null ? "not enough data" : `${context.funnel.toInterview}%`}`
    : `They have only just started tracking, so there is no usable history. Build
around what they asked for and the time they have.`;

  const { object } = await generateObject({
    model: captureModel(),
    schema: strategyProposalsSchema,
    schemaName: "StrategyProposals",
    schemaDescription:
      "Three job search activity plans of increasing intensity, with ramped phases.",
    system: context.grounded ? GROUNDED_PROMPT : AMBITION_PROMPT,
    prompt: `What the applicant wants:
"""
${context.goalText.slice(0, 2000)}
"""

They plan to work ${context.activeDaysPerWeek} days a week.

${history}`,
  });

  return object.proposals;
}
