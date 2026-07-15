"use client";

import { useTranslations } from "next-intl";
import { PackCard } from "@/src/features/home/PackCard";
import { PackScrollRail } from "@/src/shared/components/PackScrollRail";
import { useRecentlyPlayed } from "./api/recently-played.queries";

/**
 * A user's recently-played packs as a horizontal {@link PackScrollRail}.
 *
 * `visible` is the caller's privacy decision — render (and fetch) only when the
 * viewer is allowed to see this history (the profile is public, or the viewer
 * is the owner / staff). When there's nothing to show the whole section
 * collapses, so a fresh account's profile isn't cluttered with an empty rail.
 */
export function RecentlyPlayedSection({
  userId,
  visible,
}: {
  userId: string;
  visible: boolean;
}) {
  const t = useTranslations("profile");
  const query = useRecentlyPlayed(userId, visible);

  if (!visible) return null;

  const packs = query.data?.pages.flatMap((page) => page.items) ?? [];
  // Nothing to show (and not still loading the first page) → collapse entirely.
  if (packs.length === 0) return null;

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
