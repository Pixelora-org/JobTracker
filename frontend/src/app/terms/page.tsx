import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-16 sm:px-6">
      <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
        pipeline
      </Link>
      <h1 className="mt-8 text-2xl font-medium tracking-tight">Terms</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          Pipeline is a personal job-search tracker. It is provided as-is, with
          no guarantee that an application, an email, or a plan will lead to an
          interview or an offer.
        </p>
        <p>
          You are responsible for the content you store and the messages you
          send. Do not use the outreach tools to spam. AI drafts are suggestions.
          Read them before you hit send.
        </p>
        <p>
          Shared AI and contact-lookup features are rate-limited per account so
          one person cannot exhaust the pool. Limits may change as usage grows.
        </p>
        <p>
          We may suspend accounts that abuse the service or other people. You
          can stop using Pipeline at any time and delete your data.
        </p>
      </div>
    </main>
  );
}
