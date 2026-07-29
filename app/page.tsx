import type { Metadata } from "next";
import { HomeFeed } from "@/src/features/home/HomeFeed";
import { DashboardHero } from "@/src/features/home/DashboardHero";
import { ContinuePlayingRail } from "@/src/features/home/ContinuePlayingRail";
import { getHomeFeedServer } from "@/src/features/home/get-home-feed-server";

/** Reads a single `q` value from the (possibly repeated/absent) search param. */
function readQuery(q: string | string[] | undefined): string {
  return (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}): Promise<Metadata> {
  const query = readQuery((await searchParams).q);
  // A search landing (`/?q=…`) is a thin, per-query view — keep it out of the
  // index so it never competes with the canonical browse page or pack pages.
  return query ? { robots: { index: false, follow: false } } : {};
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const query = readQuery((await searchParams).q);
  // Seed the feed server-side for indexable landing content; null on failure
  // falls back to HomeFeed's own client fetch. Keyed on the query so a new
  // top-bar search remounts the feed with the fresh seed.
  const initialFeed = await getHomeFeedServer(query || undefined);

  return (
    <main className="flex flex-1 flex-col gap-8 px-7 py-10 max-[620px]:px-4">
      {/* Promo hero + join-by-code card (mock: Dashboard.dc.html). Both halves
          self-hide while rooms are dormant (ROOMS_DORMANT) — see
          DashboardHero's own doc comment — so there is no dead-end room pitch
          or join flow; both revive together when multiplayer returns. */}
      <DashboardHero />
      {/* Personal, client-only resume rail — renders nothing on the server or
          when the browser has no in-progress plays, so it never affects the
          indexable home content. Sits between the hero and the browse grid,
          matching the dashboard mock. */}
      <ContinuePlayingRail />
      <HomeFeed
        key={query}
        initialFeed={initialFeed ?? undefined}
        initialQuery={query}
      />
    </main>
  );
}
