import type { ReactNode } from "react";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { PackCoverBanner } from "@/src/features/pack/PackCoverBanner";
import { PackHeroStats } from "@/src/features/pack/PackHeroStats";
import { PackHowItPlays } from "@/src/features/pack/PackHowItPlays";
import { RoundChips } from "@/src/features/pack/RoundChips";
import { PackStats } from "@/src/features/pack/PackStats";
import { TopPickedTable } from "@/src/features/result/TopPickedTable";
import { PackCreatorCard } from "@/src/features/pack/PackCreatorCard";
import { PackPlayButton } from "@/src/features/pack/PackPlayButton";
import { PackOwnerActions } from "@/src/features/pack/PackOwnerActions";
import { PackOwnerStatusBadge } from "@/src/features/pack/PackOwnerStatusBadge";
import { CommentSection } from "@/src/features/pack/CommentSection";
import { VoteButtons } from "@/src/features/pack/VoteButtons";
import { ShareButton } from "@/src/features/share/ShareButton";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults, RankResults } from "@/src/shared/types/play-results";

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <Text
      as="h2"
      variant="tertiary"
      className="mb-4 text-xs font-medium uppercase tracking-[0.14em]"
    >
      {children}
    </Text>
  );
}

export function PackDetailScreen({
  pack,
  results,
}: {
  pack: Pack;
  results: PackResults | RankResults;
}) {
  const tFormat = useTranslations("formats");
  const t = useTranslations("pack");
  const tResult = useTranslations("result");
  // Every format except rank_blind, whose results are placements rather than
  // picks. "What wins most" is the statistic for all of them, and each round is
  // a random draw rather than a fixed list, so a per-round breakdown says less.
  const topItems =
    results.format === "rank_blind" ? [] : (results.topItems ?? []);
  // Same number under the verb the player actually performed.
  const topHeading =
    pack.format === "save_one"
      ? "topSavedHeading"
      : pack.format === "sacrifice_one"
        ? "topSacrificedHeading"
        : "topPickedHeading";
  const sectionLabel =
    pack.format === "nxn" ? t("sectionCategory") : t("sectionGroup");

  return (
    <main className={cn(PACK_CONTAINER, "flex-1 py-10")}>
      <div className="flex flex-col gap-11">
        <PackCoverBanner pack={pack} />

        {/* Info row: description + primary actions on the left, stats and the
            (secondary) vote control on the right. */}
        <section className="flex flex-wrap gap-10">
          <div className="flex min-w-[280px] flex-1 basis-[420px] flex-col gap-5">
            <PackOwnerStatusBadge
              packAuthorId={pack.authorId}
              status={pack.status}
            />

            {pack.description && (
              <Text
                variant="secondary"
                className="max-w-xl text-base leading-relaxed"
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

            <div className="flex flex-wrap items-center gap-3.5">
              <PackPlayButton packId={pack.id} />
              {pack.status === "approved" && (
                <ShareButton path={`/packs/${pack.id}`} />
              )}
              <PackOwnerActions
                packId={pack.id}
                packAuthorId={pack.authorId}
                packStatus={pack.status}
              />
            </div>
          </div>

          <div className="flex flex-col items-start gap-5">
            <PackHeroStats pack={pack} />
            <VoteButtons
              packId={pack.id}
              initialLikes={pack.likes}
              initialDislikes={pack.dislikes}
              initialMyVote={pack.myVote}
            />
          </div>
        </section>

        <section>
          <SectionHeading>
            {t("howItPlaysHeading", { format: tFormat(pack.format) })}
          </SectionHeading>
          <PackHowItPlays format={pack.format} />
        </section>

        <section>
          <SectionHeading>
            {t("roundsHeading", { section: sectionLabel })}
          </SectionHeading>
          <RoundChips pack={pack} />
        </section>

        {/* "Which item wins most" IS the statistic here — the generic per-round
            breakdown says far less about it, and divides by every play of the
            pack rather than by the rounds an item actually appeared in. Falls
            back to that breakdown only when there is nothing to rank yet. */}
        {topItems.length > 0 ? (
          <section>
            <SectionHeading>{tResult(topHeading)}</SectionHeading>
            <TopPickedTable items={topItems} label={tResult(topHeading)} />
          </section>
        ) : (
          <section>
            <SectionHeading>{t("playerStats")}</SectionHeading>
            <PackStats results={results} />
          </section>
        )}

        <PackCreatorCard pack={pack} />

        <CommentSection packId={pack.id} packAuthorId={pack.authorId} />
      </div>
    </main>
  );
}
