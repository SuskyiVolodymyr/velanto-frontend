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
import { PodiumTable } from "@/src/features/result/PodiumTable";
import { PackCreatorCard } from "@/src/features/pack/PackCreatorCard";
import { PackPlayButton } from "@/src/features/pack/PackPlayButton";
import { PackOwnerActions } from "@/src/features/pack/PackOwnerActions";
import { PackOwnerStatusBadge } from "@/src/features/pack/PackOwnerStatusBadge";
import { CommentSection } from "@/src/features/pack/CommentSection";
import { VoteButtons } from "@/src/features/pack/VoteButtons";
import { ShareButton } from "@/src/features/share/ShareButton";
import { isUiPackFormat, type Pack } from "@/src/shared/types/pack";
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
  // The pack-wide ranking, in whichever shape this format has one: "which item
  // wins most" for the four pick formats, "how often each item reached the
  // podium" for rank_blind, whose results are placements rather than picks.
  // Null until there is something to rank — that is when the generic per-round
  // breakdown below stands in.
  let ranking: { heading: string; table: ReactNode } | null = null;
  if (results.format === "rank_blind") {
    const podium = results.podium ?? [];
    if (podium.length > 0) {
      ranking = {
        heading: tResult("podiumHeading"),
        table: <PodiumTable items={podium} />,
      };
    }
  } else {
    const topItems = results.topItems ?? [];
    if (topItems.length > 0) {
      // Same number under the verb the player actually performed.
      const heading = tResult(
        pack.format === "save_one"
          ? "topSavedHeading"
          : pack.format === "sacrifice_one"
            ? "topSacrificedHeading"
            : "topPickedHeading",
      );
      ranking = {
        heading,
        table: <TopPickedTable items={topItems} label={heading} />,
      };
    }
  }
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
              {/* UI-EXCLUDED:save_one_friends (velanto-frontend#368) — don't
                  offer Play for a format with no play path: /play 404s for it
                  (see PlayRouter), so the CTA would be a dead end. */}
              {isUiPackFormat(pack.format) && <PackPlayButton packId={pack.id} />}
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

        {/* The pack-wide ranking IS the statistic here — the generic per-round
            breakdown says far less about it, and divides by every play of the
            pack rather than by the rounds an item actually appeared in. Falls
            back to that breakdown only when there is nothing to rank yet. */}
        {ranking ? (
          <section>
            <SectionHeading>{ranking.heading}</SectionHeading>
            {ranking.table}
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
