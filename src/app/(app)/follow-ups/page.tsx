import { redirect } from "next/navigation";

/** Follow-ups is now the Due tab of Outreach. Kept so old links still land. */
export default function FollowUpsRedirect() {
  redirect("/contacts?tab=due");
}
