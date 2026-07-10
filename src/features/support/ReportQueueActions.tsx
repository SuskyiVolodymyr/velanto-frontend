import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import type { ReportStatus } from "@/src/shared/types/report";

interface ReportQueueActionsProps {
  status: ReportStatus;
  actionBusy: boolean;
  actionError: string;
  onReview: () => void;
  onClose: () => void;
}

export function ReportQueueActions({
  status,
  actionBusy,
  actionError,
  onReview,
  onClose,
}: ReportQueueActionsProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "new" && (
          <Button disabled={actionBusy} onClick={onReview}>
            Review
          </Button>
        )}
        {status !== "closed" && (
          <Button variant="secondary" disabled={actionBusy} onClick={onClose}>
            Mark resolved
          </Button>
        )}
      </div>
      {actionError && <Text className="text-sm text-[#ff6b6b]">{actionError}</Text>}
    </>
  );
}
