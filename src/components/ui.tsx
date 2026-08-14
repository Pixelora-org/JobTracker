import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export function MicroLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted",
        className
      )}
    >
      {children}
    </span>
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md";
  }
>(function Button(
  { children, className, variant = "primary", size = "md", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50",
        size === "sm" && "h-9 px-3 text-sm sm:h-8",
        size === "md" && "h-10 px-3.5 text-sm sm:h-9",
        variant === "primary" &&
          "bg-accent text-white hover:bg-[#2945c9] focus-visible:outline-accent",
        variant === "secondary" &&
          "border border-border bg-surface text-text hover:bg-background",
        variant === "ghost" && "text-muted hover:bg-background hover:text-text",
        variant === "danger" &&
          "bg-[#9B2C3D] text-white hover:bg-[#7f2433]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-accent sm:h-9",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-accent sm:h-9",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[88px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-accent",
        className
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <MicroLabel>{label}</MicroLabel>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

/**
 * Underline tabs for switching between different content within a page. For
 * switching how the *same* data is drawn, use a segmented control instead.
 */
export function TabBar({
  items,
  active,
  onSelect,
  ariaLabel,
}: {
  items: { id: string; label: string; badge?: number }[];
  active: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex items-center gap-1 border-b border-border"
    >
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(item.id)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors",
              selected
                ? "border-accent font-medium text-text"
                : "border-transparent text-muted hover:text-text"
            )}
          >
            {item.label}
            {item.badge ? (
              <span className="rounded-full bg-stale px-1.5 font-mono text-[10px] tabular-nums text-white">
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function StatusPill({
  status,
  color,
}: {
  status: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-medium"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, white)`,
      }}
    >
      {status}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-10">
      <div>
        <h2 className="text-base font-medium text-text">{title}</h2>
        <p className="mt-1 max-w-md text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-[#f1c0c8] bg-[#fdf2f4] px-3 py-2 text-sm text-[#9B2C3D]"
    >
      {message}
    </div>
  );
}
