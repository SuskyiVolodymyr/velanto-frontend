import { Skeleton } from "@/src/shared/components/Skeleton";

/** Route-level skeleton for a pack detail page: back button, title/meta, cover,
 * and the play/sidebar column, matching the page's max-w-[1120px] layout. */
export default function PackLoading() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-7 pt-6">
      <Skeleton className="h-9 w-24" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="aspect-[16/9] w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
