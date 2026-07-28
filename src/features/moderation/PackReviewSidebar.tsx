import { useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Input } from "@/src/shared/components/Input";

export interface PackReviewSidebarProps {
  packTitle: string;
  approving: boolean;
  rejecting: boolean;
  actionError: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

/**
 * The pack-review screen's sticky sidebar: Approve, or Reject with a
 * required reason — mirroring `PackApprovalsTab`'s existing inline
 * reject-reason flow, just moved into a sidebar (D6). Owns its own
 * show-reject-form/typed-reason state, since that's local UI state no
 * sibling needs to read; the actual mutations stay in `PackReviewScreen`.
 * No Request-changes button, no per-item mark-for-edit (D5/D7 cuts).
 */
export function PackReviewSidebar({
  packTitle,
  approving,
  rejecting,
  actionError,
  onApprove,
  onReject,
}: PackReviewSidebarProps) {
  const t = useTranslations("moderation");
  const tCommon = useTranslations("common");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const actionBusy = approving || rejecting;

  return (
    <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
      <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface-card p-5">
        <Button loading={approving} disabled={actionBusy} onClick={onApprove}>
          {t("approve")}
        </Button>

        {!showRejectForm ? (
          <Button
            variant="danger"
            disabled={actionBusy}
            onClick={() => setShowRejectForm(true)}
          >
            {t("reject")}
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <Input
              aria-label={t("rejectReasonAria", { title: packTitle })}
              placeholder={t("rejectPlaceholder")}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="danger"
                disabled={actionBusy || rejectReason.trim().length === 0}
                loading={rejecting}
                onClick={() => onReject(rejectReason.trim())}
              >
                {t("confirmReject")}
              </Button>
              <Button
                variant="secondary"
                disabled={actionBusy}
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectReason("");
                }}
              >
                {tCommon("cancel")}
              </Button>
            </div>
          </div>
        )}

        {actionError && (
          <Text variant="danger" className="text-sm">
            {actionError}
          </Text>
        )}
      </div>
    </aside>
  );
}
