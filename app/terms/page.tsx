import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  LegalScreen,
  type LegalSection,
} from "@/src/features/legal/LegalScreen";
import { LEGAL_LAST_UPDATED } from "@/src/features/legal/legal-meta";
import { buildOpenGraph } from "@/src/shared/lib/open-graph";
import { SITE_URL } from "@/src/shared/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms");
  const title = t("metaTitle");
  const description = t("metaDescription");
  const url = `${SITE_URL}/terms`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: buildOpenGraph({ title, description, url }),
  };
}

export default async function TermsPage() {
  const t = await getTranslations("terms");
  return (
    <LegalScreen
      heading={t("heading")}
      intro={t("intro")}
      lastUpdatedLabel={t("lastUpdatedLabel")}
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={t.raw("sections") as LegalSection[]}
    />
  );
}
