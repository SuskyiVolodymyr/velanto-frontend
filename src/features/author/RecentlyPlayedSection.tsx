"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/src/shared/components/Badge";
import { Button } from "@/src/shared/components/Button";
import { PlayHistoryToggle } from "@/src/shared/components/PlayHistoryToggle";
import { Text } from "@/src/shared/components/Text";
import { useRecentlyPlayed } from "./api/recently-played.queries";

/**
 * A user's recently-played packs as a vertical row list — the History tab's
 * body (2.0.0 redesign, replacing the earlier horizontal `PackScrollRail`).
 * Not yet wired into `ProfileTabs`/`AuthorScreen` (that's T7); this task only
 * restyles the presentation of the same query.
 *
 * `visible` is the caller's privacy decision — render (and fetch) only when the
 * viewer is allowed to see this history (the profile is public, or the viewer
 * is the owner / staff).
 *
 * `showEmptyState` doubles as this component's "own profile" signal: the only
 * call site (`AuthorScreen`) already passes `showEmptyState={isOwnProfile}`,
 * so it's reused here rather than threading a second, redundant prop. When
 * true, the section also renders the shared {@link PlayHistoryToggle} ("Show
 * play history publicly") above the list — the exact same `useSetPlayHistory`
 * mutation `PrivacySection` uses, so the two surfaces can never disagree (see
 * the profile/preferences plan's D5/T5). On your OWN profile, an empty result
 * still renders (placeholder copy + the toggle) once the query settles, so the
 * section is discoverable before you've played anything; elsewhere (or while
 * the first page is still loading) it collapses entirely.
 *
 * Row content is deliberately minimal: a real `Pack` carries no "kind"
 * (solo/scored/room/resume) and no "played at" timestamp — only the pack
 * itself, the same shape `AuthorPackList`/`PackCard` already render. The
 * mock's icon-by-kind / detail-line / relative-time treatment isn't
 * derivable from that and is cut here rather than faked (matching D7/D11's
 * "drop rather than fabricate" discipline elsewhere in that plan) — in
 * particular, `pack.createdAt` is NOT reused as a stand-in "played at" time,
 * since that would mislabel when the pack was published as when this viewer
 * played it. Each row shows the pack's format (the same `tFormat` badge
 * `PackCard` renders), its title (linking to the pack), and a "Play again"
 * action link.
 */
export function RecentlyPlayedSection({
  userId,
  visible,
  showEmptyState = false,
}: {
  userId: string;
  visible: boolean;
  showEmptyState?: boolean;
}) {
  const t = useTranslations("profile");
  const tFormat = useTranslations("formats");
  const tResult = useTranslations("result");
  const query = useRecentlyPlayed(userId, visible);

  if (!visible) return null;

  const packs = query.data?.pages.flatMap((page) => page.items) ?? [];

  if (packs.length === 0) {
    // Settled-empty on your own profile → show the toggle + a placeholder;
    // elsewhere (or while the first page is still loading) collapse entirely.
    if (showEmptyState && !query.isLoading) {
      return (
        <section className="flex flex-col gap-4">
          <PlayHistoryToggle />
          <Text variant="secondary" className="text-sm">
            {t("recentlyPlayedEmpty")}
          </Text>
        </section>
      );
    }
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      {showEmptyState && <PlayHistoryToggle />}

      <ul className="flex flex-col gap-2">
        {packs.map((pack) => (
          <li
            key={pack.id}
            className="flex items-center gap-3 rounded-tile border border-border bg-surface-card p-3"
          >
            <Badge variant="default" className="shrink-0">
              {tFormat(pack.format)}
            </Badge>
            <Link
              href={`/packs/${pack.id}`}
              className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground hover:text-acc"
            >
              {pack.title}
            </Link>
            <Link
              href={`/packs/${pack.id}`}
              className="shrink-0 text-[13px] font-semibold text-acc hover:text-acc-hover"
            >
              {tResult("playAgain")}
            </Link>
          </li>
        ))}
      </ul>

      {query.hasNextPage && (
        <Button
          variant="secondary"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
        </Button>
      )}
    </section>
  );
}
