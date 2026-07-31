"use client";

import { useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { Modal } from "@/src/shared/components/Modal";
import {
  Dropdown,
  type DropdownOption,
} from "@/src/shared/components/Dropdown";
import { Textarea } from "@/src/shared/components/Textarea";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { useAuth } from "@/src/shared/lib/auth-context";
import { ApiError } from "@/src/shared/lib/api-client";
import { cn } from "@/src/shared/lib/cn";
import { reportsClient } from "@/src/shared/lib/reports-client";
import { REPORT_REASON_LABELS } from "@/src/shared/lib/report-reasons";

// The reason ids valid for a pack report — sourced from report-reasons.ts's
// own hand-mirror of the backend's REPORT_REASONS.pack (velanto-backend
// src/modules/reports/types/reasons.ts) rather than a second copy of the list.
// The LABELS there stay English-only (per that file's own header comment,
// verbatim from the design mocks); this dialog's visible text is localized
// via `pack.report.reasons.*` instead of reportReasonLabel().
const PACK_REPORT_REASONS = Object.keys(REPORT_REASON_LABELS.pack);

/**
 * The pack detail header's "Report this pack" action — a flag button that
 * opens a reason + optional-comment dialog, submitting to the same
 * `POST /reports` endpoint the moderation queue already reads (type: "pack").
 * Signed-out visitors see the button blocked with a sign-in tooltip, same
 * anon-gate pattern as Vote/Comment/FriendsRoomEntry.
 *
 * The backend rejects a second report of the same pack by the same reporter
 * with a 409 (`"You've already reported this"`) — treated here as a SUCCESS,
 * not an error: it means the caller is already in the "reported" state,
 * which is exactly what the button then shows, whether this session
 * submitted it or a past one did.
 */
export function ReportPackDialog({ packId }: { packId: string }) {
  const t = useTranslations("pack.report");
  const tAuth = useTranslations("authGate");
  const { user } = useAuth();
  const blocked = user === null;

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [reported, setReported] = useState(false);

  function openDialog() {
    if (blocked || reported) return;
    setError(false);
    setOpen(true);
  }

  function closeDialog() {
    if (submitting) return;
    setOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason || submitting) return;
    setError(false);
    setSubmitting(true);
    try {
      await reportsClient.create({
        type: "pack",
        targetId: packId,
        reason,
        comment: comment.trim() || undefined,
      });
      setReported(true);
      setOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setReported(true);
        setOpen(false);
      } else {
        setError(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // No "select a reason" row in the list — the trigger shows the placeholder
  // until something is picked, so an unselectable first option would only be a
  // dead row you can arrow onto.
  const reasonOptions: DropdownOption<string>[] = PACK_REPORT_REASONS.map(
    (id) => ({ value: id, label: t(`reasons.${id}`) }),
  );

  const label = reported ? t("buttonReported") : t("button");

  const trigger = (
    <button
      type="button"
      onClick={openDialog}
      aria-disabled={blocked || reported || undefined}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-[38px] items-center gap-2 rounded-control border px-3.5 text-[13px] font-semibold transition-colors",
        reported
          ? "cursor-default border-danger/35 bg-danger/10 text-[#ff8c8c]"
          : "border-border bg-surface-card text-foreground-secondary hover:border-border-strong hover:text-danger",
        blocked && "cursor-not-allowed opacity-45",
      )}
    >
      <Flag size={15} aria-hidden />
      {/* Icon-only below 481px — the sticky header (Back/Share/Report/Vote)
          measurably overflowed a 390px phone before this collapsed; see
          BackButton/ShareButton's own compact treatment for the same fix. */}
      <span aria-hidden className="hidden min-[481px]:inline">
        {label}
      </span>
    </button>
  );

  // Wrap the trigger in the sign-in tooltip only while blocked — once
  // reported, the button explains itself and needs no tooltip.
  const gated: ReactElement = blocked ? (
    <Tooltip content={tAuth("logInToReport")}>{trigger}</Tooltip>
  ) : (
    trigger
  );

  return (
    <>
      {gated}
      <Modal open={open} onClose={closeDialog} title={t("title")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
              options={reasonOptions}
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
              rows={3}
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
    </>
  );
}
