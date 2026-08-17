import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Text } from "@/ui/Text";
import { PageHeader } from "@/ui/PageHeader";
import { cn } from "@/utils/cn";
import { PAGE_CONTAINER_FULL } from "@/constants/page-container";
import { PeopleFeed } from "@/features/home/components/PeopleFeed";
import { buildOpenGraph } from "@/utils/open-graph";
import { SITE_URL } from "@/constants/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("people");
  const title = t("metaTitle");
  const description = t("metaDescription");
  const url = `${SITE_URL}/people`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: buildOpenGraph({ title, description, url }),
  };
}

/**
 * People discovery route. Split out of the old Browse tab strip into its own
 * indexable Server-Component page (2.0.0 shell): the sidebar links straight
 * here, the pathname carries a clean active state, and the search island keeps
 * owning its own query/pagination.
 */
export default async function PeoplePage() {
  const t = await getTranslations("people");
  const th = await getTranslations("header");
  return (
    <>
      {/* Same back-pill bar as the other top-level listings reached from the
          sidebar (my-packs, rules, suggestions) — /people was the one left
          without any header at all. */}
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
        <PeopleFeed />
      </main>
    </>
  );
}
