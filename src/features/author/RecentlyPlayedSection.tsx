"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button, buttonClassName } from "@/src/shared/components/Button";
import { EmptyState } from "@/src/shared/components/EmptyState";
import { PlayHistoryToggle } from "@/src/shared/components/PlayHistoryToggle";
import { cn } from "@/src/shared/lib/cn";
import { packFormatTone } from "@/src/shared/lib/pack-format-tone";
import { formatRelativeTimeIntl } from "@/src/shared/lib/relative-time";
import { useRecentlyPlayed } from "./api/recently-played.queries";

/**
 * A user's recently-played packs as a vertical row list — the History tab's
 * body.
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
 * mutation `PrivacySection` uses, so the two surfaces can never disagree. On
 * your OWN profile, an empty result still renders (placeholder + the toggle)
 * once the query settles, so the section is discoverable before you've played
 * anything; elsewhere (or while the first page is still loading) it collapses.
 *
 * Each row carries the mock's four parts: a format-toned glyph tile, the pack
 * title, a detail line, and when you played it. The played-at time is real —
 * `/users/:id/recently-played` returns `lastPlayedAt` per pack — and is NOT
 * `pack.createdAt`, which would mislabel when the pack was published as when
 * this viewer played it.
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
  const tHome = useTranslations("home.card");
  const locale = useLocale();
  const query = useRecentlyPlayed(userId, visible);

  if (!visible) return null;

  const packs = query.data?.pages.flatMap((page) => page.items) ?? [];

  if (packs.length === 0) {
    // Settled-empty on your own profile → show the toggle + a placeholder;
    // elsewhere (or while the first page is still loading) collapse entirely.
    if (showEmptyState && !query.isLoading) {
      return (
        <section className="flex flex-col gap-3">
          <PlayHistoryToggle />
          <EmptyState
            icon={<Clock size={21} strokeWidth={1.8} />}
            title={t("recentlyPlayedEmpty")}
            description={t("recentlyPlayedEmptyNote")}
            action={
              <Link
                href="/"
                className={buttonClassName("outline", undefined, "sm")}
              >
                {t("browsePacks")}
              </Link>
            }
          />
        </section>
      );
    }
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      {showEmptyState && <PlayHistoryToggle />}

      <ul className="flex flex-col gap-3">
        {packs.map((pack) => {
          const { Icon, tile } = packFormatTone(pack.format);
          const playedLabel = formatRelativeTimeIntl(pack.lastPlayedAt, locale);
          return (
            <li
              key={pack.id}
              className="flex items-center gap-[13px] rounded-[15px] border border-white/[0.07] bg-surface-card px-[15px] py-[13px]"
            >
              <span
                aria-hidden
                className={cn(
                  "grid h-[38px] w-[38px] flex-none place-items-center rounded-[11px]",
                  tile,
                )}
              >
                <Icon size={18} strokeWidth={2} />
              </span>

              <div className="flex min-w-0 flex-col gap-[3px]">
                <Link
                  href={`/packs/${pack.id}`}
                  className="truncate text-[13.5px] font-[650] text-foreground hover:text-acc"
                >
                  {pack.title}
                </Link>
                <span className="truncate text-[11.5px] text-foreground-tertiary">
                  {tFormat(pack.format)} ·{" "}
                  {tHome("playsCount", { plays: pack.totalPlays })}
                </span>
              </div>

              <span className="ms-auto flex flex-none items-center gap-3">
                {playedLabel && (
                  <time
                    dateTime={pack.lastPlayedAt}
                    suppressHydrationWarning
                    className="hidden text-[11.5px] whitespace-nowrap text-foreground-tertiary min-[480px]:inline"
                  >
                    {playedLabel}
                  </time>
                )}
                {/* Straight into the session, matching PackCard's own Play
                    action — a "Play again" that lands on a description page
                    with another Play button costs a click. */}
                <Link
                  href={`/packs/${pack.id}/play`}
                  className="text-[12.5px] font-[650] whitespace-nowrap text-acc hover:text-acc-hover"
                >
                  {tResult("playAgain")}
                </Link>
              </span>
            </li>
          );
        })}
      </ul>

      {query.hasNextPage && (
        <Button
          variant="outline"
          className="self-center"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
        </Button>
      )}
    </section>
  );
}
