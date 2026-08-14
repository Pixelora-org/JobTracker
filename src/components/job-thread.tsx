"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@clerk/nextjs";
import {
  saveSharedJobAction,
  sendMessageAction,
} from "@/lib/actions/friends";
import { createClient } from "@/lib/supabase/client";
import type { JobMessage, JobThread } from "@/lib/types";
import { Button, ErrorBanner, Textarea } from "@/components/ui";

function toMessage(row: Record<string, unknown>): JobMessage {
  return {
    id: String(row.id),
    threadId: String(row.thread_id),
    userId: String(row.user_id),
    body: String(row.body),
    createdAt: String(row.created_at),
  };
}

export function JobThreadChat({
  userId,
  thread,
  messages: initial,
  peerHandle,
}: {
  userId: string;
  thread: JobThread;
  messages: JobMessage[];
  peerHandle: string | null;
}) {
  const router = useRouter();
  const { session } = useSession();
  const [live, setLive] = useState<JobMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const isOwner = thread.ownerId === userId;
  const messages = [...initial, ...live.filter((m) => !initial.some((i) => i.id === m.id))];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!session) return;

    const supabase = createClient(async () => session.getToken());
    const channel = supabase
      .channel(`job-messages:${thread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_messages",
          filter: `thread_id=eq.${thread.id}`,
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
  }, [session, thread.id]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setError(null);
    setBody("");
    startTransition(async () => {
      const result = await sendMessageAction({ threadId: thread.id, body: text });
      if (!result.ok) {
        setBody(text);
        setError(result.error);
      }
    });
  }

  function saveToBoard() {
    setError(null);
    startTransition(async () => {
      const result = await saveSharedJobAction(thread.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedId(result.data.id);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div>
        <Link
          href="/friends"
          className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-text"
        >
          ← Friends
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight text-text">
              {thread.company}
            </h1>
            <p className="mt-1 text-sm text-muted">{thread.role}</p>
            <p className="mt-1 font-mono text-[11px] text-muted">
              With {peerHandle ?? "friend"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {thread.jobUrl ? (
              <a
                href={thread.jobUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3.5 text-sm text-text hover:bg-background"
              >
                Job post
              </a>
            ) : null}
            {isOwner && thread.applicationId ? (
              <Link
                href={`/applications/${thread.applicationId}`}
                className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3.5 text-sm text-text hover:bg-background"
              >
                Application
              </Link>
            ) : null}
            {!isOwner ? (
              savedId ? (
                <Link
                  href={`/applications/${savedId}`}
                  className="inline-flex h-9 items-center rounded-md bg-accent-soft px-3.5 text-sm text-accent"
                >
                  On my board
                </Link>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={saveToBoard}
                >
                  Save to my board
                </Button>
              )
            ) : null}
          </div>
        </div>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <div className="rounded-lg border border-border bg-surface">
        <div className="max-h-[420px] space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted">
              No messages yet. Company, role, and the job URL are visible to
              both of you. Private notes stay off this thread.
            </p>
          ) : (
            messages.map((msg) => {
              const mine = msg.userId === userId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      mine
                        ? "bg-accent-soft text-text"
                        : "bg-background text-text"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted">
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="border-t border-border p-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message"
            className="min-h-[72px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button type="submit" disabled={pending || !body.trim()}>
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
