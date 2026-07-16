import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  LegalScreen,
  type LegalSection,
} from "@/src/features/legal/LegalScreen";
import { LEGAL_LAST_UPDATED } from "@/src/features/legal/legal-meta";
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
    // `images` is explicit because declaring an `openGraph` object at all stops
    // Next inheriting the file-based `app/opengraph-image.tsx`. See the same
    // note in app/privacy/page.tsx.
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ["/opengraph-image"],
    },
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
