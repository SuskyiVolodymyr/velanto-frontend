import { useTranslations } from "next-intl";
import { formatDate } from "@/src/shared/lib/format-date";
import { Text } from "@/src/shared/components/Text";
import { Username } from "@/src/shared/components/Username";
import type { AdminUserDetail } from "@/src/shared/types/admin";

/** One labelled number tile in the summary's stat row. */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[12px] border border-border bg-white/[0.03] px-3 py-2.5">
      <Text variant="tertiary" className="text-[11px]">
        {label}
      </Text>
      <Text className="mt-0.5 text-lg font-semibold">{value}</Text>
    </div>
  );
}

/**
 * Compact reported-account card for a `user`-type report (T7/D8) — the
 * account-card half of the design mock's "user" report mode: username,
 * joined date, and packs/comments counts. Styled as a small, consistent
 * sibling of `AdminUserDetailScreen`'s own stat tiles/`PackReviewAuthorCard`,
 * not a divergent new look.
 *
 * Aggregate counts only. The mock's itemized "recent reports against this
 * account" list is now `ReportsAgainstTarget`, a sibling section on the same
 * screen (it pages `GET /reports?targetId=`, added alongside the profile
 * report button) — it stays out of this card because this card needs
 * `GET /admin/users/:id` and is therefore manager/admin-only, while the
 * itemized list is reachable by every moderator.
 */
export function ReportedUserSummary({ user }: { user: AdminUserDetail }) {
  const t = useTranslations("moderation");

  return (
    <section className="flex flex-col gap-3.5 rounded-[16px] border border-border bg-white/[0.02] px-[22px] py-5">
      <div>
        <Text className="text-[15px] font-semibold">
          <Username
            username={user.username}
            role={user.role}
            trusted={user.trusted}
            showRole
          />
        </Text>
        <Text variant="tertiary" className="mt-0.5 text-xs">
          {t("reportedUserJoined", { date: formatDate(user.createdAt) })}
        </Text>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={t("reportedUserPacks")} value={user.content.packsTotal} />
        <Stat
          label={t("reportedUserComments")}
          value={user.activity.commentsCount}
        />
        <Stat
          label={t("reportedUserReportsAgainst")}
          value={user.moderation.reportsAgainst}
        />
        <Stat
          label={t("reportedUserReportsFiled")}
          value={user.moderation.reportsFiled}
        />
      </div>
    </section>
  );
}
