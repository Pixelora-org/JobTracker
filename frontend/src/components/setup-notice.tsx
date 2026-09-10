import { MicroLabel } from "@/components/ui";

export function SetupNotice() {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <MicroLabel>Setup</MicroLabel>
      <h1 className="mt-2 text-xl font-medium tracking-tight">
        Connect a Supabase project
      </h1>
      <p className="mt-2 text-sm text-muted">
        Add your project URL and publishable key to <code>.env.local</code>,
        then restart the dev server.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-xs text-text">
        {`NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>`}
      </pre>
      <p className="mt-4 text-sm text-muted">
        Run <code>supabase/schema.sql</code> in the SQL editor to create the
        tables and row level security policies.
      </p>
    </div>
  );
}
