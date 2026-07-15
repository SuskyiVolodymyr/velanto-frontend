"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("moderation");
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "new" && (
          <Button loading={actionBusy} onClick={onReview}>
            {t("review")}
          </Button>
        )}
        {status !== "closed" && (
          <Button variant="secondary" loading={actionBusy} onClick={onClose}>
            {t("markResolved")}
          </Button>
        )}
      </div>
      {actionError && (
        <Text className="text-sm text-danger">{actionError}</Text>
      )}
    </>
  );
}
