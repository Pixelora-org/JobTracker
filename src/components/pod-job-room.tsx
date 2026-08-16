"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@clerk/nextjs";
import {
  savePodJobAction,
  sendPodMessageAction,
} from "@/lib/actions/pods";
import { createClient } from "@/lib/supabase/client";
import { STATUS_COLORS } from "@/lib/constants";
import type { Pod, PodJob, PodJobSave, PodMember, PodMessage } from "@/lib/types";
import { Button, ErrorBanner, StatusPill, Textarea } from "@/components/ui";

function toMessage(row: Record<string, unknown>): PodMessage {
  return {
    id: String(row.id),
    podJobId: String(row.pod_job_id),
    userId: String(row.user_id),
    body: String(row.body),
    createdAt: String(row.created_at),
  };
}

export function PodJobRoom({
  userId,
  pod,
  job,
  members,
  saves,
  messages: initial,
}: {
  userId: string;
  pod: Pod;
  job: PodJob;
  members: PodMember[];
  saves: PodJobSave[];
  messages: PodMessage[];
}) {
  const router = useRouter();
  const { session } = useSession();
  const [live, setLive] = useState<PodMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [savedId, setSavedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const accepted = members.filter((m) => m.status === "accepted");
  const mine = saves.find((s) => s.userId === userId);
  const messages = [
    ...initial,
    ...live.filter((m) => !initial.some((i) => i.id === m.id)),
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!session) return;
    const supabase = createClient(async () => session.getToken());
    const channel = supabase
      .channel(`pod-messages:${job.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pod_messages",
          filter: `pod_job_id=eq.${job.id}`,
        },
        (payload) => {
          const next = toMessage(payload.new as Record<string, unknown>);
          setLive((prev) => {
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session, job.id]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setError(null);
    setBody("");
    startTransition(async () => {
      const result = await sendPodMessageAction({ podJobId: job.id, body: text });
      if (!result.ok) {
        setBody(text);
        setError(result.error);
      }
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await savePodJobAction(job.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedId(result.data.id);
      router.refresh();
    });
  }

  function handleFor(user: string) {
    const m = accepted.find((x) => x.userId === user);
    if (user === userId) return "You";
    return m?.handle ? `@${m.handle}` : "Member";
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      {error ? <ErrorBanner message={error} /> : null}
      <div>
        <Link
          href={`/pods/${pod.id}`}
          className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-text"
        >
          ← {pod.name}
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight">{job.company}</h1>
            <p className="mt-1 text-sm text-muted">{job.role}</p>
            {job.jobUrl ? (
              <a
                href={job.jobUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block font-mono text-[11px] text-accent hover:underline"
              >
                Job posting ↗
              </a>
            ) : null}
          </div>
          {mine?.applicationId || savedId ? (
            <Link
              href={`/applications/${savedId ?? mine?.applicationId}`}
              className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3.5 text-sm hover:bg-background"
            >
              Open on my board
            </Link>
          ) : (
            <Button type="button" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save to my board"}
            </Button>
          )}
        </div>
      </div>

      <section className="rounded-lg border border-border bg-surface px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          Status
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {accepted.map((m) => {
            const save = saves.find((s) => s.userId === m.userId);
            return (
              <div key={m.id} className="min-w-[7rem]">
                <p className="font-mono text-[11px] text-muted">
                  {m.userId === userId ? "You" : m.handle ? `@${m.handle}` : "Member"}
                </p>
                {save ? (
                  <StatusPill
                    status={save.status}
                    color={STATUS_COLORS[save.status]}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted">Not on their board</p>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          Status follows each person&apos;s own board. Move the card there and
          it updates here.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-surface">
        <div className="max-h-[28rem] space-y-3 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted">
              Notes for the group: OA, recruiter names. Not a general chat.
            </p>
          ) : (
            messages.map((m) => (
              <div key={m.id}>
                <p className="font-mono text-[10px] uppercase text-muted">
                  {handleFor(m.userId)}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-text">
                  {m.body}
                </p>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write to the pod…"
            className="min-h-[44px]"
          />
          <Button type="submit" disabled={pending || !body.trim()}>
            {pending ? "Sending…" : "Send"}
          </Button>
        </form>
      </section>
    </div>
  );
}
