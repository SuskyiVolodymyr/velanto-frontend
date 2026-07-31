import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Text } from "@/src/shared/components/Text";
import { PageHeader } from "@/src/shared/components/PageHeader";
import { cn } from "@/src/shared/lib/cn";
import { PAGE_CONTAINER_FULL } from "@/src/shared/lib/page-container";
import { HistoryFeed } from "@/src/features/home/HistoryFeed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("history");
  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    // A private, per-user view keyed off the signed-in session — nothing for a
    // crawler to index, same as /my-packs. The sidebar routes a signed-out user
    // to /auth; a direct visit renders HistoryFeed's login prompt (no server
    // redirect).
    robots: { index: false, follow: false },
  };
}

/**
 * The signed-in user's play history — every pack they've played, most recently
 * played first. Framed like /my-packs (its sidebar sibling): back-pill header,
 * heading, then the feed, which owns the auth gate and the paginated fetch.
 */
export default async function HistoryPage() {
  const t = await getTranslations("history");
  const th = await getTranslations("header");
  return (
    <>
      <PageHeader
        back={{ href: "/", label: th("browse") }}
        crumb={t("title")}
      />
      <main className={cn(PAGE_CONTAINER_FULL, "flex-1 py-10")}>
        <Text as="h1" variant="title" className="mb-2 text-3xl">
          {t("title")}
        </Text>
        <Text variant="secondary" className="mb-8 max-w-lg">
          {t("subtitle")}
        </Text>
        <HistoryFeed />
      </main>
    </>
  );
}
