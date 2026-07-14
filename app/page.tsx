import { getTranslations } from "next-intl/server";
import { Text } from "@/src/shared/components/Text";
import { HomeFeed } from "@/src/features/home/HomeFeed";
import { getHomeFeedServer } from "@/src/features/home/get-home-feed-server";

export default async function Home() {
  const t = await getTranslations("home");
  // Seed the default feed server-side for indexable landing content; null on
  // failure falls back to HomeFeed's own client fetch.
  const initialFeed = await getHomeFeedServer();

  return (
    <main className="flex-1 px-7 py-10">
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        {t("title")}
      </Text>
      <Text variant="secondary" className="mb-8 max-w-lg">
        {t("subtitle")}
      </Text>
      <HomeFeed initialFeed={initialFeed ?? undefined} />
    </main>
  );
}
