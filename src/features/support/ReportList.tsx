import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { Button } from "@/src/shared/components/Button";
import { ReportRow } from "@/src/features/support/ReportRow";
import type { ReportWithReporter } from "@/src/shared/types/report";

interface ReportListProps {
  loading: boolean;
  error: Error | null;
  listReady: boolean;
  reports: ReportWithReporter[];
  total: number;
  loadingMore: boolean;
  loadMoreError: string;
  onLoadMore: () => void;
}

export function ReportList({
  loading,
  error,
  listReady,
  reports,
  total,
  loadingMore,
  loadMoreError,
  onLoadMore,
}: ReportListProps) {
  return (
    <>
      {loading && <LoadingState label="Loading reports…" showLabel />}
      {error && (
        <Text className="text-danger">
          Couldn&apos;t load reports. Try again later.
        </Text>
      )}
      {listReady && reports.length === 0 && (
        <Text variant="secondary">No reports match these filters.</Text>
      )}

      {listReady && reports.length > 0 && (
        <div className="flex flex-col gap-2">
          {reports.map((report) => (
            <ReportRow key={report.id} report={report} />
          ))}
        </div>
      )}

      {listReady && reports.length < total && (
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            loading={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
          {loadMoreError && (
            <Text className="text-sm text-danger">{loadMoreError}</Text>
          )}
        </div>
      )}
    </>
  );
}
