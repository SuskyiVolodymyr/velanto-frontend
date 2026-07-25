import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Text } from "@/src/shared/components/Text";
import { MyPacksFeed } from "@/src/features/home/MyPacksFeed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("myPacks");
  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    // A private, per-user view keyed off the signed-in session — nothing for a
    // crawler to index. The sidebar routes a signed-out user to /auth; a direct
    // visit renders MyPacksFeed's login-required prompt (no server redirect).
    robots: { index: false, follow: false },
  };
}

/**
 * The signed-in author's own packs, split out of the old Browse tab strip into
 * its own route (2.0.0 shell). MyPacksFeed handles the auth gate and the
 * status-filtered fetch; this route just frames it and marks the page noindex.
 */
export default async function MyPacksPage() {
  const t = await getTranslations("myPacks");
  return (
    <main className="flex-1 px-7 py-10">
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        {t("title")}
      </Text>
      <Text variant="secondary" className="mb-8 max-w-lg">
        {t("subtitle")}
      </Text>
      <MyPacksFeed />
    </main>
  );
}
