"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SKIP_STRATEGY_COOKIE } from "@/lib/constants";

/** Remembers that the first-run redirect was declined, so it stops firing. */
export async function skipStrategyAction() {
  const store = await cookies();
  store.set(SKIP_STRATEGY_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  redirect("/board");
}
