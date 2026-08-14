import Link from "next/link";
import { Show } from "@clerk/nextjs";

function MockBoard() {
  const columns = [
    {
      label: "Applied",
      color: "#3352E1",
      cards: [
        { company: "Stripe", role: "Security intern", days: "2d" },
        { company: "Anthropic", role: "SWE intern", days: "5d" },
      ],
    },
    {
      label: "Phone Screen",
      color: "#D89A2E",
      cards: [{ company: "Notion", role: "Trust intern", days: "1d" }],
    },
    {
      label: "Interview",
      color: "#D89A2E",
      cards: [{ company: "Datadog", role: "SWE intern", days: "today" }],
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_28px_70px_-28px_rgba(18,21,28,0.4)]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          Today · 6 left
        </span>
        <span className="font-mono text-[11px] text-accent">On pace</span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border">
        {columns.map((col) => (
          <div key={col.label} className="p-3">
            <p
              className="font-mono text-[10px] uppercase tracking-[0.08em]"
              style={{ color: col.color }}
            >
              {col.label}
            </p>
            <div className="mt-2 space-y-2">
              {col.cards.map((card) => (
                <div
                  key={card.company}
                  className="rounded-md border border-border bg-background px-2.5 py-2"
                  style={{ borderLeftWidth: 3, borderLeftColor: col.color }}
                >
                  <p className="text-xs font-medium text-text">{card.company}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{card.role}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    {card.days}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
            pipeline
          </Link>
          <div className="flex items-center gap-2">
            <Show when="signed-in">
              <Link
                href="/board"
                className="inline-flex h-9 items-center rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:bg-[#2945c9]"
              >
                Open board
              </Link>
            </Show>
            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="inline-flex h-9 items-center rounded-md px-3 text-sm text-muted hover:text-text"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-9 items-center rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:bg-[#2945c9]"
              >
                Start tracking
              </Link>
            </Show>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
            Plan · Apply · Track
          </p>
          <h1 className="mt-4 max-w-3xl text-[2.5rem] font-medium leading-[1.05] tracking-tight text-text sm:text-6xl">
            Track the search,
            <span className="text-accent"> not the spreadsheet.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Paste a posting. Log the cold email. Run a daily plan that counts
            itself. Pipeline is the job search tracker you actually keep using.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Show when="signed-out">
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-white hover:bg-[#2945c9]"
              >
                Start tracking, free
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href="/board"
                className="inline-flex h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-white hover:bg-[#2945c9]"
              >
                Go to your board
              </Link>
            </Show>
            <span className="font-mono text-[11px] text-muted">
              Private by default · your data stays yours
            </span>
          </div>

          <div className="mt-14">
            <MockBoard />
          </div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-20 sm:grid-cols-3 sm:px-6">
            {[
              {
                step: "01",
                title: "Paste, don’t type",
                body: "Drop a job posting or a cold email into Quick add. AI fills the record. You hit okay. Under fifteen seconds.",
              },
              {
                step: "02",
                title: "Find someone worth emailing",
                body: "Every application has an outreach panel: who to contact, where to search, a draft you actually send.",
              },
              {
                step: "03",
                title: "A plan that keeps score",
                body: "Set 15 applications a day. Pipeline counts from what you already log, and tells you how far behind you are.",
              },
            ].map((item) => (
              <div key={item.step}>
                <p className="font-mono text-[11px] text-accent">{item.step}</p>
                <h2 className="mt-2 text-lg font-medium text-text">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <p className="font-mono text-[11px] text-muted">pipeline</p>
          <div className="flex gap-4 font-mono text-[11px] text-muted">
            <Link href="/privacy" className="hover:text-text">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-text">
              Terms
            </Link>
            <Show when="signed-out">
              <Link href="/sign-in" className="hover:text-text">
                Log in
              </Link>
            </Show>
          </div>
        </div>
      </footer>
    </div>
  );
}
