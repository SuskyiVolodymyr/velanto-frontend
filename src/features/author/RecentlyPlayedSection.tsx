"use client";

import { useTranslations } from "next-intl";
import { PackCard } from "@/src/features/home/PackCard";
import { PackScrollRail } from "@/src/shared/components/PackScrollRail";
import { Text } from "@/src/shared/components/Text";
import { useRecentlyPlayed } from "./api/recently-played.queries";

/**
 * A user's recently-played packs as a horizontal {@link PackScrollRail}.
 *
 * `visible` is the caller's privacy decision — render (and fetch) only when the
 * viewer is allowed to see this history (the profile is public, or the viewer
 * is the owner / staff).
 *
 * When there's nothing to show, other people's profiles collapse the section so
 * a fresh account isn't cluttered with an empty rail. On your OWN profile
 * (`showEmptyState`) we instead render a placeholder once the query settles, so
 * the section is discoverable before you've played anything — otherwise it just
 * looks like the feature is missing.
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
  const query = useRecentlyPlayed(userId, visible);

  if (!visible) return null;

  const packs = query.data?.pages.flatMap((page) => page.items) ?? [];
  if (packs.length === 0) {
    // Settled-empty on your own profile → show a placeholder; elsewhere (or
    // while the first page is still loading) collapse entirely.
    if (showEmptyState && !query.isLoading) {
      return (
        <section className="flex flex-col">
          <Text as="h2" variant="title" className="mb-4 text-lg">
            {t("recentlyPlayed")}
          </Text>
          <Text variant="secondary" className="text-sm">
            {t("recentlyPlayedEmpty")}
          </Text>
        </section>
      );
    }
    return null;
  }

  return (
    <PackScrollRail
      title={t("recentlyPlayed")}
      itemCount={packs.length}
      hasNextPage={query.hasNextPage}
      isFetchingNextPage={query.isFetchingNextPage}
      fetchNextPage={() => void query.fetchNextPage()}
    >
      {packs.map((pack) => (
        <div key={pack.id} className="w-[280px] shrink-0 snap-start">
          <PackCard pack={pack} />
        </div>
      ))}
    </PackScrollRail>
  );
}
