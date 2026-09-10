import { redirect } from "next/navigation";

/** The table is now a view on the board. Kept so old links still land. */
export default function ApplicationsRedirect() {
  redirect("/board?view=table");
}
