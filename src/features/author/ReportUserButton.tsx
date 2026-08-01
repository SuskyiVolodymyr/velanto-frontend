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

// Mirrors the backend's REPORT_REASONS.user via report-reasons.ts rather than
// listing the ids a second time; the visible labels come from `report.userReasons.*`.
const USER_REPORT_REASONS = Object.keys(REPORT_REASON_LABELS.user);

/**
 * "Report" in the profile page header — the account-level counterpart to
 * {@link ReportPackDialog}, filing `type: "user"` against the profile being
 * viewed. This is the report a moderator sees named in the queue and can act on
 * with the ban tools already on this page.
 *
 * Rendered for everyone except the profile's owner, including signed-out
 * visitors: they get the button visibly blocked with a sign-in tooltip rather
 * than a surprise redirect (the project-wide anon-gate pattern), so the action
 * is discoverable before you have an account.
 */
export function ReportUserButton({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const t = useTranslations("report");
  const tAuth = useTranslations("authGate");
  const { user } = useAuth();
  const blocked = user === null;

  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);

  function openDialog() {
    if (blocked || reported) return;
    setOpen(true);
  }

  const reasonOptions: DropdownOption<string>[] = USER_REPORT_REASONS.map(
    (id) => ({ value: id, label: t(`userReasons.${id}`) }),
  );

  const label = reported ? t("buttonReported") : t("buttonUser");

  const trigger = (
    <button
      type="button"
      onClick={openDialog}
      aria-disabled={blocked || reported || undefined}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-[38px] items-center gap-2 rounded-[11px] border px-3.5 text-[13px] font-semibold transition-colors",
        reported
          ? "cursor-default border-danger/35 bg-danger/10 text-[#ff8c8c]"
          : "border-white/[0.09] bg-surface-card text-foreground-secondary hover:border-white/20 hover:text-danger",
        blocked && "cursor-not-allowed opacity-45",
      )}
    >
      <Flag size={15} aria-hidden />
      {/* Icon-only on a narrow phone, like the pack header's own Report pill —
          the label is still on the button via aria-label/title. */}
      <span aria-hidden className="hidden min-[481px]:inline">
        {label}
      </span>
    </button>
  );

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
        title={t("userTitle", { username })}
        note={t("userNote")}
        reportType="user"
        targetId={userId}
        reasons={reasonOptions}
      />
    </>
  );
}
