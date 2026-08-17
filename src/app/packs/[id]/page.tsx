import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
// The overview shape, not the full pack: this page draws round CHIPS, never the
// items behind them. See PackOverview in types/pack.
import { getPackOverviewServer } from "@/server/get-pack-server";
import { getResultsServer } from "@/server/get-results-server";
import { getAvailableModesServer } from "@/server/get-available-modes-server";
import { PackDetailScreen } from "@/features/pack/components/PackDetailScreen";
import { PackDetailFallback } from "@/features/pack/components/PackDetailFallback";
import { buildOpenGraph } from "@/utils/open-graph";
import { buildJsonLd, jsonLdScript } from "@/utils/jsonld";
import { SITE_URL } from "@/constants/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackOverviewServer(id);
  if (!pack) {
    const t = await getTranslations("pages");
    return {
      title: t("packNotFound"),
      robots: { index: false, follow: false },
    };
  }
  const url = `${SITE_URL}/packs/${id}`;
  const description = pack.description.trim();
  return {
    title: pack.title,
    description,
    alternates: { canonical: url },
    openGraph: buildOpenGraph({
      title: pack.title,
      description,
      url,
      // The cover+title card is co-located at app/packs/[id]/opengraph-image.tsx.
      deferImageToRoute: true,
    }),
  };
}

export default async function PackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getPackOverviewServer(id);
  if (!pack) return <PackDetailFallback packId={id} />;
  const [results, availableModes] = await Promise.all([
    getResultsServer(id),
    getAvailableModesServer(id),
  ]);

  // CreativeWork, not Quiz/Game: Quiz means a knowledge test (packs are
  // preference/elimination games, not assessments), and Game isn't a
  // Google-supported rich result and would overstate multiplayer support
  // (rooms are dormant — every pack is played solo today). Author is
  // deliberately omitted: PackAuthorSummary isn't present on this
  // single-pack response, and resolving it would mean an extra fetch.
  const jsonLd = buildJsonLd({
    "@type": "CreativeWork",
    name: pack.title,
    description: pack.description.trim(),
    url: `${SITE_URL}/packs/${id}`,
    inLanguage: pack.language,
    datePublished: pack.firstPublishedAt ?? pack.createdAt,
    ...(pack.tags.length > 0 ? { keywords: pack.tags.join(", ") } : {}),
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/PlayAction",
      userInteractionCount: pack.totalPlays,
    },
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <PackDetailScreen
        pack={pack}
        results={results}
        availableModes={availableModes}
      />
    </>
  );
}
