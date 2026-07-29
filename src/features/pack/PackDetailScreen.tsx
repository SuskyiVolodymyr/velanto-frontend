import type { ReactNode } from "react";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { BackButton } from "@/src/shared/components/BackButton";
import { PackCoverBanner } from "@/src/features/pack/PackCoverBanner";
import { PackHeroStats } from "@/src/features/pack/PackHeroStats";
import { PackHowItPlays } from "@/src/features/pack/PackHowItPlays";
import { RoundChips } from "@/src/features/pack/RoundChips";
import { PackStats } from "@/src/features/pack/PackStats";
import { TopPickedTable } from "@/src/features/result/TopPickedTable";
import { PodiumTable } from "@/src/features/result/PodiumTable";
import { PackCreatorCard } from "@/src/features/pack/PackCreatorCard";
import { PackPlayButton } from "@/src/features/pack/PackPlayButton";
import { PackPlayEstimate } from "@/src/features/pack/PackPlayEstimate";
import { FriendsRoomEntry } from "@/src/features/friends-rooms/FriendsRoomEntry";
import { ROOMS_DORMANT } from "@/src/features/friends-rooms/room-types";
import { PackOwnerActions } from "@/src/features/pack/PackOwnerActions";
import { PackOwnerStatusBadge } from "@/src/features/pack/PackOwnerStatusBadge";
import { PackRejectionReason } from "@/src/features/pack/PackRejectionReason";
import { CommentSection } from "@/src/features/pack/CommentSection";
import { VoteButtons } from "@/src/features/pack/VoteButtons";
import { ShareButton } from "@/src/features/share/ShareButton";
import { type Pack } from "@/src/shared/types/pack";
import type { PackResults, RankResults } from "@/src/shared/types/play-results";

function SectionHeading({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2.5">
      <Text
        as="h2"
        variant="tertiary"
        className="text-[12px] font-bold uppercase tracking-[0.14em]"
      >
        {children}
      </Text>
      {aside && (
        <Text variant="tertiary" className="text-[12.5px]">
          {aside}
        </Text>
      )}
    </div>
  );
}

// A card surface for the sidebar and stat panels — the mock's raised
// surface-card with a hairline border.
function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  // Radius and padding come from the caller — the sidebar panels and the stat
  // panel differ, and cn() is a plain join (not tailwind-merge), so a base
  // radius here would collide with an override rather than be replaced.
  return (
    <div className={cn("border border-border bg-surface-card", className)}>
      {children}
    </div>
  );
}

export function PackDetailScreen({
  pack,
  results,
}: {
  pack: Pack;
  results: PackResults | RankResults;
}) {
  const t = useTranslations("pack");
  const tFormat = useTranslations("formats");
  const tResult = useTranslations("result");

  // The pack-wide ranking, in whichever shape this format has one (see below).
  // Null until there is something to rank — the per-round breakdown stands in.
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
  const isApproved = pack.status === "approved";

  return (
    <>
      {/* Sticky action bar: back to browse on the left, share + the (secondary)
          vote control on the right. */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div
          className={cn(
            PACK_CONTAINER,
            "flex items-center gap-3 py-3 max-[720px]:px-4",
          )}
        >
          <BackButton href="/" />
          <div className="ms-auto flex items-center gap-2.5">
            {isApproved && <ShareButton path={`/packs/${pack.id}`} />}
            <VoteButtons
              packId={pack.id}
              initialLikes={pack.likes}
              initialDislikes={pack.dislikes}
              initialMyVote={pack.myVote}
            />
          </div>
        </div>
      </div>

      <main className={cn(PACK_CONTAINER, "flex-1 pb-16 pt-[18px]")}>
        <PackCoverBanner pack={pack} />

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_368px]">
          {/* Sticky sidebar — DOM-FIRST on purpose: on mobile it stacks above
              the main column (the design's play-panel-first order), and keeping
              it first in the DOM means visual order matches reading/focus order.
              lg:order-2 moves it to the right column on desktop, where the main
              content (lg:order-1) sits on the left. */}
          <aside className="flex flex-col gap-3.5 lg:sticky lg:top-[82px] lg:order-2">
            {/* Play panel. Every pack is played solo today; room play for all
                formats is the unbuilt multiplayer redesign and is deliberately
                not faked here. */}
            <Panel className="flex flex-col gap-3 rounded-[20px] p-5">
              <PackPlayButton packId={pack.id} />
              <PackPlayEstimate pack={pack} />
              {/* Room infra is dormant until every mode's UI ships (see
                  docs/superpowers/plans/2026-07-29-rooms-ui-plan.md, Task 31) —
                  FriendsRoomEntry itself no-ops nothing here since it has no
                  ROOMS_DORMANT guard of its own; it is simply not rendered
                  until that flip, mirroring how JoinRoomCard guards itself. */}
              {!ROOMS_DORMANT && <FriendsRoomEntry packId={pack.id} />}
            </Panel>

            <PackCreatorCard pack={pack} />

            <PackOwnerActions
              packId={pack.id}
              packAuthorId={pack.authorId}
              packStatus={pack.status}
            />
          </aside>

          {/* Main column */}
          <div className="flex min-w-0 flex-col gap-8 lg:order-1">
            <section className="flex flex-col gap-4">
              <PackOwnerStatusBadge
                packAuthorId={pack.authorId}
                status={pack.status}
              />
              <PackRejectionReason
                packAuthorId={pack.authorId}
                status={pack.status}
                rejectionReason={pack.rejectionReason}
              />
              {pack.description && (
                <Text
                  variant="secondary"
                  className="max-w-[66ch] text-[15.5px] leading-[1.62] text-pretty"
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
              <PackHeroStats pack={pack} />
            </section>

            <section className="flex flex-col gap-3.5">
              <SectionHeading>
                {t("howItPlaysHeading", { format: tFormat(pack.format) })}
              </SectionHeading>
              <PackHowItPlays format={pack.format} />
            </section>

            <section className="flex flex-col gap-3.5">
              <SectionHeading>
                {t("roundsHeading", { section: sectionLabel })}
              </SectionHeading>
              <RoundChips pack={pack} />
            </section>

            {ranking ? (
              <section className="flex flex-col gap-3.5">
                <SectionHeading>{ranking.heading}</SectionHeading>
                <Panel className="rounded-[18px] p-[18px]">
                  {ranking.table}
                </Panel>
              </section>
            ) : (
              <section className="flex flex-col gap-3.5">
                <SectionHeading>{t("playerStats")}</SectionHeading>
                <PackStats results={results} />
              </section>
            )}

            <CommentSection packId={pack.id} packAuthorId={pack.authorId} />
          </div>
        </div>
      </main>
    </>
  );
}
