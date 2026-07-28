import { useTranslations } from "next-intl";
import { formatLabel } from "@/src/shared/lib/pack-display";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { PACK_LANGUAGE_NAMES } from "@/src/shared/types/pack-language";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { CoverImage } from "@/src/shared/components/CoverImage";
import type { Pack } from "@/src/shared/types/pack";

/**
 * The pack-review screen's identity block: status/crumb, submitted-by line,
 * cover, title, description, tags, format/language, and pool/round summary
 * sentence. Split out of `PackReviewScreen` (which stays a thin orchestrator,
 * mirroring `ReportDetailScreen`'s delegation to `ReportDetailSummary`) —
 * this component only reads fields already on the fetched `Pack`, no
 * mark-for-edit or timeline (D5/D7).
 */
export function PackReviewSummary({ pack }: { pack: Pack }) {
  const t = useTranslations("moderation");

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <StatusBadge kind="pack" status={pack.status} />
        <span className="text-xs font-semibold uppercase text-foreground-secondary">
          {t("packCrumb")}
        </span>
      </div>

      <Text variant="secondary" className="text-sm">
        {t("packSubmittedBy", {
          author: pack.author?.username ?? "—",
          date: formatDateTime(pack.submittedAt ?? pack.createdAt),
        })}
      </Text>

      {(pack.coverImageKey || pack.coverTone) && (
        <div
          className="relative h-[130px] w-full overflow-hidden rounded-[16px] border border-border"
          style={{
            background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)`,
          }}
        >
          {pack.coverImageKey && <CoverImage coverKey={pack.coverImageKey} />}
        </div>
      )}

      <Text as="h1" variant="title" className="text-2xl">
        {pack.title}
      </Text>

      {pack.description && (
        <Text
          variant="secondary"
          className="text-[15px] leading-[1.6] text-pretty"
        >
          {pack.description}
        </Text>
      )}

      {pack.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pack.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-foreground-tertiary">
        <span>{formatLabel(pack.format)}</span>
        <span aria-hidden>·</span>
        <span>{PACK_LANGUAGE_NAMES[pack.language]}</span>
      </div>

      <Text variant="tertiary" className="text-[12.5px]">
        {t("packSummarySentence", {
          pools: pack.groups.length,
          rounds: pack.rounds.length,
        })}
      </Text>
    </section>
  );
}
