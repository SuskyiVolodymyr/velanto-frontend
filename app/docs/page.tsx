import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { DocsScreen } from "@/src/features/docs/DocsScreen";
import { buildOpenGraph } from "@/src/shared/lib/open-graph";
import { SITE_URL } from "@/src/shared/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs");
  const title = t("metaTitle");
  const description = t("metaDescription");
  const url = `${SITE_URL}/docs`;
  return {
    // Absolute overrides the layout's "%s | Velanto" template, matching every
    // other content route (rules/terms/privacy/updates).
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: buildOpenGraph({ title, description, url }),
  };
}

export default function DocsPage() {
  // DocsScreen reads the active topic from the query string via
  // useSearchParams, which Next requires be wrapped in a Suspense boundary.
  return (
    <Suspense>
      <DocsScreen />
    </Suspense>
  );
}
