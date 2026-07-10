import { Text } from "@/src/shared/components/Text";
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
  return (
    <>
      {loading && <Text variant="secondary">Loading feedback…</Text>}
      {error && (
        <Text className="text-[#ff6b6b]">Couldn&apos;t load feedback. Try again.</Text>
      )}
      {listReady && items.length === 0 && (
        <Text variant="secondary">No feedback matches these filters.</Text>
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
          <Button variant="secondary" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
          {loadMoreError && <Text className="text-sm text-[#ff6b6b]">{loadMoreError}</Text>}
        </div>
      )}
    </>
  );
}
