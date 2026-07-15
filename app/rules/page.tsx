import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RulesScreen } from "@/src/features/rules/RulesScreen";
import { getRulesServer } from "@/src/features/rules/get-rules-server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://playvelanto.com";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rules");
  const title = t("metaTitle");
  const description = t("metaDescription");
  const url = `${SITE_URL}/rules`;
  return {
    // Absolute overrides the layout's "%s | Velanto" template so the tab reads
    // exactly "Community Rules — Velanto".
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function RulesPage() {
  let rules = null;
  try {
    rules = await getRulesServer();
  } catch {
    // Backend unreachable / non-200 — render the graceful error state rather
    // than crashing the route.
    rules = null;
  }
  return <RulesScreen rules={rules} />;
}
