import { Skeleton } from "@/src/shared/components/Skeleton";

/** Route-level skeleton for the admin panel: title, tab bar, and a stack of
 * rows, matching AdminScreen's max-w-4xl layout. */
export default function AdminLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-7 py-10">
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="mb-8 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </main>
  );
}
