import Link from "next/link";
import type { TodayAction } from "@/lib/today";
import { MicroLabel } from "@/components/ui";

export function TodayHome({
  actions,
  hasStrategy,
  restDay,
}: {
  actions: TodayAction[];
  hasStrategy: boolean;
  restDay: boolean;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <MicroLabel>Do next</MicroLabel>
        <Link
          href="/strategy"
          className="font-mono text-[11px] text-accent hover:underline"
        >
          {hasStrategy ? "Adjust volume ↗" : "Set a volume ↗"}
        </Link>
      </div>

      {actions.length === 0 ? (
        <div className="px-4 py-8 sm:px-5">
          <p className="text-sm text-text">
            {restDay
              ? "Rest day. Nothing is owed."
              : "Nothing waiting. Add a role or log outreach and this list fills itself."}
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-border">
          {actions.map((action, i) => (
            <li key={action.id}>
              <Link
                href={action.href}
                className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-background sm:px-5"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-[11px] text-accent">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-text">
                    {action.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {action.detail}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
