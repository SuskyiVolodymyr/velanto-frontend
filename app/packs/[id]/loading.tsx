import { Skeleton } from "@/src/shared/components/Skeleton";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";

/** Route-level skeleton for a pack detail page: back button, title/meta, cover,
 * and the play/sidebar column, matching the page's shared PACK_CONTAINER layout. */
export default function PackLoading() {
  return (
    <div className={cn(PACK_CONTAINER, "pt-6")}>
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
