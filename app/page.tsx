import { Text } from "@/src/shared/components/Text";
import { HomeFeed } from "@/src/features/home/HomeFeed";
import { getHomeFeedServer } from "@/src/features/home/get-home-feed-server";

export default async function Home() {
  // Seed the default feed server-side for indexable landing content; null on
  // failure falls back to HomeFeed's own client fetch.
  const initialPacks = await getHomeFeedServer();

  return (
    <main className="flex-1 px-7 py-10">
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        Discover packs
      </Text>
      <Text variant="secondary" className="mb-8 max-w-lg">
        Browse packs by format or tag, then play through one to see who&apos;s
        left standing.
      </Text>
      <HomeFeed initialPacks={initialPacks ?? undefined} />
    </main>
  );
}
