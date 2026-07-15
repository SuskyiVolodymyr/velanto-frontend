import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  LegalScreen,
  type LegalSection,
} from "@/src/features/legal/LegalScreen";
import { LEGAL_LAST_UPDATED } from "@/src/features/legal/legal-meta";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://velanto.app";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms");
  const title = t("metaTitle");
  const description = t("metaDescription");
  const url = `${SITE_URL}/terms`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
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
