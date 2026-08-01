"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { Textarea } from "@/src/shared/components/Textarea";
import { cn } from "@/src/shared/lib/cn";
import type { PackMarks } from "@/src/features/moderation/use-pack-marks";

export interface PackReviewSidebarProps {
  packTitle: string;
  approving: boolean;
  rejecting: boolean;
  requesting: boolean;
  actionError: string;
  marks: PackMarks;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRequestChanges: (message: string) => void;
}

/** The three decision buttons share a shape and differ only in tone. */
function DecisionButton({
  tone,
  disabled,
  onClick,
  children,
}: {
  tone: "approve" | "changes" | "reject";
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const TONE_CLASS = {
    approve:
      "border-success/40 bg-success/[0.12] text-success hover:bg-success/20",
    changes:
      "border-status-pending/40 bg-status-pending/[0.12] text-status-pending hover:bg-status-pending/20",
    reject: "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
  } as const;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-11 items-center justify-center gap-2 rounded-control border text-[13.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        TONE_CLASS[tone],
      )}
    >
      {children}
    </button>
  );
}

/**
 * The review screen's sticky decision panel: approve, request changes, or
 * reject.
 *
 * "Request changes" is the outcome the other two couldn't express — it hands
 * the pack back to its author with the marks made in the contents grid and a
 * message, instead of forcing a moderator to choose between publishing
 * something unfinished and turning away an author who has one bad item. Its
 * panel is where the marks made elsewhere on the screen come back into view,
 * which is why `marks` is passed in rather than owned here.
 *
 * Each expandable form owns only its own open/typed state; the mutations stay
 * in `PackReviewScreen`.
 */
export function PackReviewSidebar({
  packTitle,
  approving,
  rejecting,
  requesting,
  actionError,
  marks,
  onApprove,
  onReject,
  onRequestChanges,
}: PackReviewSidebarProps) {
  const t = useTranslations("moderation");
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesNote, setChangesNote] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const actionBusy = approving || rejecting || requesting;

  return (
    <aside className="flex flex-col gap-3.5 lg:sticky lg:top-[88px]">
      <div className="flex flex-col gap-2.5 rounded-[16px] border border-border bg-surface-card p-[18px]">
        <Text
          as="h2"
          variant="tertiary"
          className="text-[11.5px] font-bold uppercase tracking-[0.1em]"
        >
          {t("decisionHeading")}
        </Text>

        <DecisionButton
          tone="approve"
          disabled={actionBusy}
          onClick={onApprove}
        >
          {t("approvePack")}
        </DecisionButton>

        <DecisionButton
          tone="changes"
          disabled={actionBusy}
          onClick={() => setChangesOpen((open) => !open)}
        >
          {t("requestChanges")}
          {marks.count > 0 && (
            <span
              data-mono
              aria-hidden
              className="rounded-full bg-status-pending/25 px-[7px] py-px text-[11px] font-bold"
            >
              {marks.count}
            </span>
          )}
        </DecisionButton>

        {changesOpen && (
          <div className="flex flex-col gap-2.5 rounded-[13px] border border-status-pending/25 bg-status-pending/[0.05] p-3.5">
            <Text className="text-xs font-bold text-status-pending">
              {t("changesRequestedHeading")}
            </Text>

            {marks.count === 0 ? (
              // Marks are optional — the whole pack can be the problem — so
              // this explains the grid's Mark for edit rather than blocking.
              <Text variant="tertiary" className="text-[11.5px] leading-[1.5]">
                {t("changesNoMarks")}
              </Text>
            ) : (
              <ul className="flex flex-col gap-[7px]">
                {marks.marks.map((mark) => (
                  <li
                    key={`${mark.kind}:${mark.id}`}
                    className="flex flex-col gap-1 rounded-[10px] border border-border bg-background px-2.5 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 truncate text-xs font-[650]">
                        {mark.label || t(`markKind.${mark.kind}`)}
                      </span>
                      <button
                        type="button"
                        aria-label={t("unmark", {
                          label: mark.label || t(`markKind.${mark.kind}`),
                        })}
                        onClick={() =>
                          marks.toggle({
                            kind: mark.kind,
                            id: mark.id,
                            label: mark.label,
                          })
                        }
                        className="ms-auto grid h-[22px] w-[22px] flex-none place-items-center rounded-[6px] bg-white/[0.06] text-foreground-tertiary transition-colors hover:bg-white/[0.12] hover:text-foreground"
                      >
                        <X size={11} strokeWidth={2.6} aria-hidden />
                      </button>
                    </div>
                    <Text
                      variant={mark.request ? "secondary" : "tertiary"}
                      className="text-[11.5px] leading-[1.45]"
                    >
                      {mark.request || t("markNoRequest")}
                    </Text>
                    <Text variant="tertiary" className="text-[10.5px]">
                      {t(`markKind.${mark.kind}`)}
                    </Text>
                  </li>
                ))}
              </ul>
            )}

            <label className="flex flex-col gap-1.5">
              <Text variant="secondary" className="text-[11.5px]">
                {t("changesMessageLabel")}
              </Text>
              <Textarea
                rows={3}
                maxLength={1000}
                value={changesNote}
                onChange={(event) => setChangesNote(event.target.value)}
                placeholder={t("changesMessagePlaceholder")}
              />
            </label>

            <button
              type="button"
              // The message is what tells the author what to do — the backend
              // requires it too, so an empty one can only fail.
              disabled={actionBusy || changesNote.trim().length === 0}
              onClick={() => onRequestChanges(changesNote.trim())}
              className="h-10 rounded-[10px] bg-status-pending text-[13px] font-bold text-[#1a1505] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("sendChangeRequest")}
            </button>
            <Text variant="tertiary" className="text-[11px] leading-[1.45]">
              {t("changesOutcomeNote")}
            </Text>
          </div>
        )}

        <DecisionButton
          tone="reject"
          disabled={actionBusy}
          onClick={() => setRejectOpen((open) => !open)}
        >
          {t("rejectPack")}
        </DecisionButton>

        {rejectOpen && (
          <div className="flex flex-col gap-2.5 border-t border-border pt-2.5">
            <label className="flex flex-col gap-1.5">
              <Text variant="secondary" className="text-xs font-[650]">
                {t("rejectReasonLabel")}
              </Text>
              <Textarea
                rows={3}
                maxLength={500}
                aria-label={t("rejectReasonAria", { title: packTitle })}
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder={t("rejectPlaceholder")}
              />
            </label>
            <button
              type="button"
              disabled={actionBusy || rejectReason.trim().length === 0}
              onClick={() => onReject(rejectReason.trim())}
              className="h-10 rounded-[10px] border border-danger/40 bg-danger/10 text-[13px] font-[650] text-danger transition-colors hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("confirmReject")}
            </button>
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
