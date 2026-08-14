"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUsernameAction } from "@/lib/actions/account";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";

export function UsernameSetup() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await setUsernameAction(value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 py-10">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          Account
        </p>
        <h1 className="mt-1 text-xl font-medium tracking-tight">
          Pick a username
        </h1>
        <p className="mt-2 text-sm text-muted">
          Friends add you with this handle, not your email. You can share it
          like @yourname.
        </p>
      </div>
      {error ? <ErrorBanner message={error} /> : null}
      <form
        onSubmit={save}
        className="space-y-3 rounded-lg border border-border bg-surface p-4"
      >
        <Field label="Username" hint="Letters, numbers, and underscores.">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="yourname"
            autoComplete="username"
            autoFocus
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !value.trim()}>
            {saving ? "Saving…" : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
