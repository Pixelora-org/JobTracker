import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-16 sm:px-6">
      <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
        pipeline
      </Link>
      <h1 className="mt-8 text-2xl font-medium tracking-tight">Privacy</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          Pipeline stores the job search data you enter: applications, outreach
          notes, resume files, and the daily plan you set. Each account can only
          see its own rows. We do not sell this data.
        </p>
        <p>
          Sign-in is handled by Clerk. Application data and resume files live in
          Supabase, isolated per user. Optional AI features send the text you
          paste (a job posting, a draft, a goal) to Google Gemini so the app can
          fill a form or propose a plan. Optional contact lookup sends a company
          domain to Apollo.io. Those providers see only what that feature needs.
        </p>
        <p>
          You can delete an application, a touchpoint, a resume, or your whole
          account from the product. Deleting your Clerk account removes the
          ability to sign in; ask us if you also want the stored rows wiped.
        </p>
        <p>
          Questions: use the email on the account you signed up with and write
          to the operator of this instance.
        </p>
      </div>
    </main>
  );
}
