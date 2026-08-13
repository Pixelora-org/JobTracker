"use server";

import { redirect } from "next/navigation";

/** Leave the planner and go to the kanban. */
export async function skipStrategyAction() {
  redirect("/board");
}
