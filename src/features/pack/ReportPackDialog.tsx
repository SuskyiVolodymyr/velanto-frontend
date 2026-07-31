"use client";

import { useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { ReportModal } from "@/src/shared/components/ReportModal";
import type { DropdownOption } from "@/src/shared/components/Dropdown";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { useAuth } from "@/src/shared/lib/auth-context";
import { cn } from "@/src/shared/lib/cn";
import { REPORT_REASON_LABELS } from "@/src/shared/lib/report-reasons";

// The reason ids valid for a pack report — sourced from report-reasons.ts's
// own hand-mirror of the backend's REPORT_REASONS.pack (velanto-backend
// src/modules/reports/types/reasons.ts) rather than a second copy of the list.
// The LABELS there stay English-only (per that file's own header comment,
// verbatim from the design mocks); this dialog's visible text is localized
// via `pack.report.reasons.*` instead of reportReasonLabel().
const PACK_REPORT_REASONS = Object.keys(REPORT_REASON_LABELS.pack);

/**
 * The pack detail header's "Report this pack" action — a flag button that opens
 * the shared {@link ReportModal} with the pack reason set, submitting to the
 * same `POST /reports` endpoint the moderation queue already reads
 * (type: "pack"). Signed-out visitors see the button blocked with a sign-in
 * tooltip, same anon-gate pattern as Vote/Comment/FriendsRoomEntry.
 */
export function ReportPackDialog({ packId }: { packId: string }) {
  const t = useTranslations("report");
  const tPack = useTranslations("pack.report");
  const tAuth = useTranslations("authGate");
  const { user } = useAuth();
  const blocked = user === null;

  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);

  function openDialog() {
    if (blocked || reported) return;
    setOpen(true);
  }

  // No "select a reason" row in the list — the trigger shows the placeholder
  // until something is picked, so an unselectable first option would only be a
  // dead row you can arrow onto.
  const reasonOptions: DropdownOption<string>[] = PACK_REPORT_REASONS.map(
    (id) => ({ value: id, label: tPack(`reasons.${id}`) }),
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
      <ReportModal
        open={open}
        onClose={() => setOpen(false)}
        onReported={() => {
          setReported(true);
          setOpen(false);
        }}
        title={tPack("title")}
        reportType="pack"
        targetId={packId}
        reasons={reasonOptions}
      />
    </>
  );
}
