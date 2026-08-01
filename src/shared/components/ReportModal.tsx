"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/src/shared/components/Modal";
import {
  Dropdown,
  type DropdownOption,
} from "@/src/shared/components/Dropdown";
import { Textarea } from "@/src/shared/components/Textarea";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { ApiError } from "@/src/shared/lib/api-client";
import { reportsClient } from "@/src/shared/lib/reports-client";
import type { ReportType } from "@/src/shared/types/report";

/**
 * The report form itself — reason picker, optional details, submit — plus the
 * `POST /reports` call. Every report surface (pack header, comment row, user
 * profile) opens this same dialog; only the trigger and the title differ, which
 * is why those stay with the caller.
 *
 * A 409 ("You've already reported this") is treated as SUCCESS, not an error:
 * it means the caller is already in the reported state, which is exactly what
 * the trigger then shows — whether this session filed it or a past one did.
 * `onReported` is called for both outcomes, so a caller cannot accidentally
 * distinguish them.
 */
export function ReportModal({
  open,
  onClose,
  onReported,
  title,
  note,
  reportType,
  targetId,
  roundIndex,
  reasons,
  initialComment = "",
}: {
  open: boolean;
  /** Ignored while a submit is in flight — the dialog owns that guard. */
  onClose: () => void;
  onReported: () => void;
  title: string;
  /** Optional line above the form, e.g. explaining what the report can target. */
  note?: ReactNode;
  reportType: ReportType;
  targetId: string;
  /** Required by the backend for `round` reports, rejected for every other type. */
  roundIndex?: number;
  /** Reason ids valid for `reportType`, already localized. */
  reasons: DropdownOption<string>[];
  /** Pre-fills the details field (the comment quote on a comment report). */
  initialComment?: string;
}) {
  const t = useTranslations("report");

  const [reason, setReason] = useState("");
  const [comment, setComment] = useState(initialComment);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason || submitting) return;
    setError(false);
    setSubmitting(true);
    try {
      await reportsClient.create({
        type: reportType,
        targetId,
        roundIndex,
        reason,
        comment: comment.trim() || undefined,
      });
      onReported();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        onReported();
      } else {
        setError(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={title}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {note && (
          <Text variant="tertiary" className="text-xs leading-[1.5]">
            {note}
          </Text>
        )}
        {/* A div, not a <label>: the control is a button-based listbox, and a
            <label> wrapping it would make every click on the label text
            re-trigger the button. `ariaLabel` carries the name instead. */}
        <div className="flex flex-col gap-1.5">
          <Text variant="secondary" className="text-sm">
            {t("reasonLabel")}
          </Text>
          <Dropdown
            value={reason}
            onChange={setReason}
            options={reasons}
            placeholder={t("reasonPlaceholder")}
            ariaLabel={t("reasonLabel")}
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <Text variant="secondary" className="text-sm">
            {t("commentLabel")}
          </Text>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("commentPlaceholder")}
            maxLength={500}
            rows={initialComment ? 4 : 3}
          />
        </label>
        {error && (
          <Text variant="danger" className="text-sm">
            {t("error")}
          </Text>
        )}
        <Button
          type="submit"
          variant="danger"
          loading={submitting}
          disabled={!reason}
          className="self-end"
        >
          {t("submit")}
        </Button>
      </form>
    </Modal>
  );
}
