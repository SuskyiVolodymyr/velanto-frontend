import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { Button } from "@/src/shared/components/Button";
import { FeedbackCard } from "@/src/features/feedback/FeedbackCard";
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
}: FeedbackListProps) {
  const t = useTranslations("feedback");
  return (
    <>
      {loading && <LoadingState label={t("loadingList")} showLabel />}
      {error && <Text variant="danger">{t("listError")}</Text>}
      {listReady && items.length === 0 && (
        <Text variant="secondary">{t("noMatches")}</Text>
      )}

      {listReady && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((post) => (
            <FeedbackCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {listReady && items.length < total && (
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            loading={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? t("loadingMore") : t("loadMore")}
          </Button>
          {loadMoreError && (
            <Text variant="danger" className="text-sm">
              {loadMoreError}
            </Text>
          )}
        </div>
      )}
    </>
  );
}
