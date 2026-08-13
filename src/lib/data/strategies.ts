import { createClient } from "@/lib/supabase/server";
import type { Strategy, StrategyInput, StrategyPhase } from "@/lib/types";

type StrategyRow = {
  id: string;
  user_id: string;
  name: string;
  status: "active" | "archived";
  start_date: string;
  end_date: string | null;
  active_days: number[];
  timezone: string;
  goal_text: string | null;
  rationale: string | null;
  phases: StrategyPhase[];
  created_at: string;
  updated_at: string;
};

const STRATEGY_COLUMNS =
  "id, user_id, name, status, start_date, end_date, active_days, timezone, goal_text, rationale, phases, created_at, updated_at";

function toStrategy(row: StrategyRow): Strategy {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    activeDays: row.active_days ?? [],
    timezone: row.timezone,
    goalText: row.goal_text,
    rationale: row.rationale,
    phases: row.phases ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: Partial<StrategyInput>) {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name.trim();
  if (input.startDate !== undefined) row.start_date = input.startDate;
  if (input.endDate !== undefined) row.end_date = input.endDate || null;
  if (input.activeDays !== undefined) row.active_days = input.activeDays;
  if (input.timezone !== undefined) row.timezone = input.timezone;
  if (input.goalText !== undefined) row.goal_text = input.goalText || null;
  if (input.rationale !== undefined) row.rationale = input.rationale || null;
  if (input.phases !== undefined) row.phases = input.phases;
  return row;
}

export async function getActiveStrategy() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategies")
    .select(STRATEGY_COLUMNS)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toStrategy(data as StrategyRow) : null;
}

/** Only one plan can be active, so starting a new one retires the old one. */
export async function createStrategy(input: StrategyInput, userId: string) {
  const supabase = await createClient();

  const { error: archiveError } = await supabase
    .from("strategies")
    .update({ status: "archived" })
    .eq("status", "active");
  if (archiveError) throw new Error(archiveError.message);

  const { data, error } = await supabase
    .from("strategies")
    .insert({ ...toRow(input), user_id: userId, status: "active" })
    .select(STRATEGY_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toStrategy(data as StrategyRow);
}

export async function archiveStrategy(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("strategies")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) throw new Error(error.message);
}
