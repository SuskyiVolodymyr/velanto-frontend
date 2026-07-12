import { Skeleton } from "@/src/shared/components/Skeleton";

/** Route-level skeleton for the feedback list: heading, filter chips, and a
 * stack of post rows, matching FeedbackScreen's max-w-5xl layout. */
export default function FeedbackLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-7 py-10">
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </main>
  );
}
