import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  LegalScreen,
  type LegalSection,
} from "@/src/features/legal/LegalScreen";
import { LEGAL_LAST_UPDATED } from "@/src/features/legal/legal-meta";
import { SITE_URL } from "@/src/shared/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  const title = t("metaTitle");
  const description = t("metaDescription");
  const url = `${SITE_URL}/privacy`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    // `images` is explicit because declaring an `openGraph` object at all stops
    // Next inheriting the file-based `app/opengraph-image.tsx`. Without this the
    // page previews as a bare title card everywhere OG is used (Facebook,
    // LinkedIn, Discord, Slack, iMessage) while still looking right on Twitter,
    // which reads the separately-inherited `app/twitter-image.tsx`.
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ["/opengraph-image"],
    },
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
