import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Text } from "@/src/shared/components/Text";
import { HomeFeed } from "@/src/features/home/HomeFeed";
import { JoinRoomCard } from "@/src/features/home/JoinRoomCard";
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
  const t = await getTranslations("home");
  const query = readQuery((await searchParams).q);
  // Seed the feed server-side for indexable landing content; null on failure
  // falls back to HomeFeed's own client fetch. Keyed on the query so a new
  // top-bar search remounts the feed with the fresh seed.
  const initialFeed = await getHomeFeedServer(query || undefined);

  return (
    <main className="flex flex-1 flex-col gap-8 px-7 py-10">
      <div>
        <Text as="h1" variant="title" className="mb-2 text-3xl">
          {t("title")}
        </Text>
        <Text variant="secondary" className="max-w-lg">
          {t("subtitle")}
        </Text>
      </div>
      {/* Real join-by-code hero. The speculative "every pack plays with friends"
          promo from the mock is deferred until multiplayer-for-all is built. */}
      <JoinRoomCard />
      <HomeFeed
        key={query}
        initialFeed={initialFeed ?? undefined}
        initialQuery={query}
      />
    </main>
  );
}
