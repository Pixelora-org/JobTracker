"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveStrategyAction } from "@/lib/actions/strategies";
import { useStoredText } from "@/lib/use-stored-text";
import { Button, ErrorBanner } from "@/components/ui";

/**
 * Shown once a plan has run long enough that the tracked history finally says
 * something about what this person actually sustains.
 */
export function StrategyNudge({
  strategyId,
  daysRunning,
}: {
  strategyId: string;
  daysRunning: number;
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useStoredText(
    `pipeline:retune-dismissed:${strategyId}`,
  );
  const [error, setError] = useState<string | null>(null);
  const [working, startWork] = useTransition();

  if (dismissed === "1") return null;

  function retune() {
    setError(null);
    startWork(async () => {
      const res = await archiveStrategyAction(strategyId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {error ? <ErrorBanner message={error} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-soft/40 px-4 py-3">
        <p className="text-sm text-text">
          You have {daysRunning} days of real activity behind this plan now. A
          new one can be tuned to what you actually sustain instead of what you
          guessed.
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={working}
            onClick={retune}
          >
            {working ? "Clearing…" : "Build a tuned plan"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDismissed("1")}
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
