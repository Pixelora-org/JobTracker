import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-10">
      <h2 className="text-base font-medium">Thread not found</h2>
      <p className="mt-1 text-sm text-muted">
        It may have been removed, or you don’t have access.
      </p>
      <Link
        href="/friends"
        className="mt-4 inline-block text-sm text-accent hover:underline"
      >
        Back to friends
      </Link>
    </div>
  );
}
