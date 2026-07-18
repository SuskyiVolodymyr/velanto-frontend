import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UpdatesScreen } from "@/src/features/updates/UpdatesScreen";
import { UPDATES } from "@/src/features/updates/updates-data";
import { buildOpenGraph } from "@/src/shared/lib/open-graph";
import { SITE_URL } from "@/src/shared/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("updates");
  const title = t("metaTitle");
  const description = t("metaDescription");
  const url = `${SITE_URL}/updates`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: buildOpenGraph({ title, description, url }),
  };
}

export default async function UpdatesPage() {
  const t = await getTranslations("updates");
  return (
    <UpdatesScreen
      heading={t("heading")}
      intro={t("intro")}
      emptyLabel={t("empty")}
      entries={UPDATES}
    />
  );
}
