import { Skeleton } from "@/src/shared/components/Skeleton";

/** Route-level skeleton shown while /profile resolves and redirects the owner
 * to /users/[id]. Mirrors that page's max-w-4xl layout: avatar + identity
 * header, bio, packs grid. */
export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-7 py-10">
      <div className="mb-8 flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="mb-10 h-5 w-2/3" />
      <Skeleton className="mb-4 h-6 w-32" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
}
