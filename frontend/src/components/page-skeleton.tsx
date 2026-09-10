export function PageSkeleton({
  lines = 4,
}: {
  lines?: number;
}) {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded bg-border" />
        <div className="h-6 w-40 animate-pulse rounded bg-border" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-border" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-lg border border-border bg-surface"
        />
      ))}
    </div>
  );
}
