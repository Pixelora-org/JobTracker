"use server";

import { redirect } from "next/navigation";

/** Leave the planner and go to today's list. */
export async function skipStrategyAction() {
  redirect("/today");
}
