import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  LegalScreen,
  type LegalSection,
} from "@/features/legal/LegalScreen";
import { LEGAL_LAST_UPDATED } from "@/features/legal/legal-meta";
import { buildOpenGraph } from "@/shared/lib/open-graph";
import { SITE_URL } from "@/shared/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  const title = t("metaTitle");
  const description = t("metaDescription");
  const url = `${SITE_URL}/privacy`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: buildOpenGraph({ title, description, url }),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const tl = await getTranslations("legal");
  const th = await getTranslations("header");
  const sections = t.raw("sections") as LegalSection[];
  return (
    <LegalScreen
      activeDoc="privacy"
      browseLabel={th("browse")}
      heading={t("heading")}
      intro={t("intro")}
      lastUpdatedLabel={t("lastUpdatedLabel")}
      lastUpdated={LEGAL_LAST_UPDATED}
      sectionCountLabel={tl("sectionCount", { count: sections.length })}
      sections={sections}
      termsTabLabel={tl("termsTab")}
      privacyTabLabel={tl("privacyTab")}
      onThisPageLabel={tl("onThisPage")}
      questionsTitle={tl("questionsTitle")}
      questionsNote={tl("questionsNote")}
    />
  );
}
