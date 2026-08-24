import Link from "next/link";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-accent px-10 py-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-black/10"
        />

        <Link href="/" className="relative font-mono text-sm font-semibold tracking-tight">
          pipeline
        </Link>

        <div className="relative">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
            Plan · Apply · Track
          </p>
          <h1 className="mt-3 max-w-sm text-3xl font-medium leading-tight tracking-tight">
            Track the search, not the spreadsheet.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">
            Paste a posting. Log the outreach. Run a daily plan that counts
            itself. Friends find you by username.
          </p>

          <div className="mt-10 max-w-sm space-y-2 rounded-xl border border-white/15 bg-white/10 p-3">
            {[
              { company: "Stripe", role: "Security intern", status: "Applied" },
              { company: "Notion", role: "Trust intern", status: "Phone" },
            ].map((card) => (
              <div
                key={card.company}
                className="rounded-lg border border-white/15 bg-white/10 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{card.company}</p>
                  <span className="font-mono text-[10px] uppercase tracking-wide text-white/70">
                    {card.status}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-white/75">{card.role}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative font-mono text-[11px] text-white/50">
          Your applications stay private to your account.
        </p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-12">
        <div className="mb-8 text-center lg:hidden">
          <Link
            href="/"
            className="font-mono text-sm font-semibold tracking-tight"
          >
            pipeline
          </Link>
          <p className="mt-2 text-sm text-muted">
            Track the search, not the spreadsheet.
          </p>
        </div>
        <div className="w-full max-w-[400px]">{children}</div>
        <Link
          href="/"
          className="mt-8 font-mono text-[11px] text-muted hover:text-text"
        >
          Back to home
        </Link>
      </main>
    </div>
  );
}
