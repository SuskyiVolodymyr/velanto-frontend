import { Skeleton } from "@/src/shared/components/Skeleton";
import { PACKS_FEED_PAGE_SIZE } from "@/src/features/home/api/packs-feed";

/** Shared by every pack grid and its skeleton so the two can't drift apart. */
export const PACK_GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,minmax(262px,1fr))] gap-[18px]";

/**
 * Pulsing placeholders for a grid of {@link PackCard}s, rather than a spinner:
 * the grid is the page's whole content, so holding its shape keeps the layout
 * from jumping when the real cards land — and a full-page spinner says only
 * "wait", where a skeleton also says what is coming.
 *
 * Mirrors PackCard's own proportions (the 16:10 cover, title/description lines,
 * then the action row) and defaults to a full page of them. Decorative: each
 * card is `aria-hidden` and a single sr-only `role="status"` carries the busy
 * announcement, so a screen reader hears one message instead of 25 empty cards.
 */
export function PackGridSkeleton({
  label,
  count = PACKS_FEED_PAGE_SIZE,
}: {
  /** Announced to assistive tech while the grid loads (e.g. "Loading packs…"). */
  label: string;
  count?: number;
}) {
  return (
    <div className={PACK_GRID_CLASS} data-testid="pack-grid-skeleton">
      <span role="status" className="sr-only">
        {label}
      </span>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          aria-hidden
          className="overflow-hidden rounded-[18px] border border-border bg-surface-card"
        >
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="flex flex-col gap-[7px] p-[14px]">
            <Skeleton className="h-[18px] w-3/4" />
            <Skeleton className="h-[14px] w-full" />
            <Skeleton className="mt-2 h-[38px] w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
