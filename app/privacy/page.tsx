import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  LegalScreen,
  type LegalSection,
} from "@/src/features/legal/LegalScreen";
import { LEGAL_LAST_UPDATED } from "@/src/features/legal/legal-meta";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://velanto.app";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  const title = t("metaTitle");
  const description = t("metaDescription");
  const url = `${SITE_URL}/privacy`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
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
