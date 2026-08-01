import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { Button } from "@/src/shared/components/Button";
import { EmptyState } from "@/src/shared/components/EmptyState";
import { FeedbackCard } from "@/src/features/feedback/FeedbackCard";
import { FEEDBACK_PAGE_SIZE } from "@/src/features/feedback/api/feedback-list";
import type { Feedback } from "@/src/shared/types/feedback";

interface FeedbackListProps {
  loading: boolean;
  error: Error | null;
  listReady: boolean;
  items: Feedback[];
  total: number;
  loadingMore: boolean;
  loadMoreError: string;
  onLoadMore: () => void;
  /** True while any of search/topic/status narrows the list. */
  filtering: boolean;
  onClearFilters: () => void;
  /** Opens the composer — the empty state's call to action when unfiltered. */
  onNewPost: () => void;
}

export function FeedbackList({
  loading,
  error,
  listReady,
  items,
  total,
  loadingMore,
  loadMoreError,
  onLoadMore,
  filtering,
  onClearFilters,
  onNewPost,
}: FeedbackListProps) {
  const t = useTranslations("feedback");
  const hasMore = items.length < total;

  return (
    <div className="flex flex-col gap-3.5">
      {/* The count line is the only place the list says how much of the whole it
          is showing; it stays put across loading states so the column doesn't
          jump when a filter refetches. */}
      <div className="flex items-baseline gap-2.5 px-0.5">
        <span className="text-[12.5px] text-foreground-tertiary">
          {listReady && items.length === 0
            ? t("countNone")
            : listReady
              ? t("countShowing", { shown: items.length, total })
              : ""}
        </span>
        {filtering && (
          <button
            type="button"
            onClick={onClearFilters}
            className="ms-auto cursor-pointer text-[12.5px] font-[650] text-acc-hover hover:text-acc"
          >
            {t("clearFilters")}
          </button>
        )}
      </div>

      {loading && <LoadingState label={t("loadingList")} showLabel />}
      {error && <Text variant="danger">{t("listError")}</Text>}

      {listReady && items.length === 0 && (
        <EmptyState
          icon={<MessageSquare size={21} strokeWidth={1.8} />}
          title={filtering ? t("emptyFilteredTitle") : t("emptyTitle")}
          description={filtering ? t("emptyFilteredNote") : t("emptyNote")}
          action={
            filtering ? (
              <Button variant="outline" size="sm" onClick={onClearFilters}>
                {t("clearFilters")}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onNewPost}>
                {t("postFirst")}
              </Button>
            )
          }
        />
      )}

      {listReady && items.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {items.map((post) => (
            <FeedbackCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {listReady && hasMore && (
        <div className="flex flex-col items-center gap-2">
          {/* Default `md` sizing, not a className override: `cn()` is a plain
              join, so passing a height here would leave two of them in the class
              list. 44px against the mock's 42 is within the size ladder. */}
          <Button variant="outline" loading={loadingMore} onClick={onLoadMore}>
            {loadingMore
              ? t("loadingMore")
              : t("showMore", {
                  count: Math.min(FEEDBACK_PAGE_SIZE, total - items.length),
                })}
          </Button>
          {loadMoreError && (
            <Text variant="danger" className="text-sm">
              {loadMoreError}
            </Text>
          )}
        </div>
      )}
    </div>
  );
}
