"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { isActiveBan, isPermanentBan } from "@/src/shared/lib/ban-display";
import { resolveBanReasonTitle } from "@/src/shared/lib/ban-reason-title";
import type { RuleCategory } from "@/src/shared/types/rules";

export interface BannedNoticeProps {
  /** `/me.bannedUntil` — ISO string, or null when not banned. */
  bannedUntil: string | null;
  /** `/me.banReason` — a rule-category id or `'other'`, or null. */
  banReason: string | null;
  /** `/me.banReasonDetail` — free-text context, or null. */
  banReasonDetail: string | null;
  /** Rule categories used to resolve `banReason` → human title. */
  categories: RuleCategory[];
}

/**
 * Non-dismissible notice shown to a banned user explaining *why* they're banned:
 * the human title of their ban reason, any free-text detail, when the ban lifts
 * (or that it's permanent), and a link to the rules. Purely presentational and
 * driven by the current user's own `/me` fields — it never surfaces anything the
 * backend doesn't already return to that user about themselves. Renders nothing
 * when the viewer isn't currently banned.
 */
export function BannedNotice({
  bannedUntil,
  banReason,
  banReasonDetail,
  categories,
}: BannedNoticeProps) {
  const t = useTranslations("banned");

  if (!isActiveBan(bannedUntil) || !bannedUntil) return null;

  // Resolve the reason to a human label via the shared resolver: `'other'` →
  // localized "Other"; a category id → its title from the rules; unknown/unloaded
  // → the raw id (never crash, and it's the user's own reason so no leak).
  const reasonTitle = resolveBanReasonTitle(banReason, categories, t("other"));

  const expiry = isPermanentBan(bannedUntil)
    ? t("permanent")
    : t("expiresOn", { date: new Date(bannedUntil).toLocaleDateString() });

  return (
    <div role="alert" className="border-b border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-7 py-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-1">
        <Text as="h2" className="text-sm font-semibold text-[#ff6b6b]">
          {t("heading")}
        </Text>

        {reasonTitle && (
          <Text variant="secondary" className="text-sm">
            <span className="text-foreground-tertiary">{t("reasonLabel")}: </span>
            {reasonTitle}
          </Text>
        )}

        {banReasonDetail && (
          <Text variant="secondary" className="text-sm">
            <span className="text-foreground-tertiary">{t("detailLabel")}: </span>
            {banReasonDetail}
          </Text>
        )}

        <Text variant="secondary" className="text-sm">
          {expiry}
        </Text>

        <Link href="/rules" className="text-sm text-acc underline underline-offset-2">
          {t("rulesLink")}
        </Link>
      </div>
    </div>
  );
}
