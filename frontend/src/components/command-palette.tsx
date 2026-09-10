"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type Command = {
  id: string;
  label: string;
  group: string;
  run: () => void;
};

/**
 * ⌘K used to open Quick add directly. Quick add is still the first entry and
 * pre-selected, so ⌘K then Enter behaves exactly as it always did.
 */
export function CommandPalette({
  onClose,
  commands,
}: {
  onClose: () => void;
  commands: Command[];
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // The palette is mounted only while open, so opening it is what resets the
  // query and selection. Focus is the one thing an effect still owns.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function choose(command: Command | undefined) {
    if (!command) return;
    onClose();
    command.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-[14vh] backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_-20px_rgba(18,21,28,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Type a command or page…"
          aria-label="Command palette input"
          className="w-full border-b border-border bg-transparent px-4 py-3.5 text-sm text-text outline-none placeholder:text-muted/80"
        />

        <ul className="max-h-[320px] overflow-y-auto py-1">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted">
              Nothing matches that.
            </li>
          ) : (
            results.map((command, i) => {
              const showGroup = command.group !== lastGroup;
              lastGroup = command.group;
              return (
                <li key={command.id}>
                  {showGroup ? (
                    <p className="px-4 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                      {command.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => choose(command)}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors",
                      i === index
                        ? "bg-accent-soft text-accent"
                        : "text-text hover:bg-background"
                    )}
                  >
                    {command.label}
                    {i === index ? (
                      <span className="font-mono text-[10px] text-muted">
                        ↵
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
