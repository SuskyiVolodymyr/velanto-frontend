import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { getResultsServer } from "@/src/shared/lib/get-results-server";
import { PackDetailScreen } from "@/src/features/pack/PackDetailScreen";
import { PackDetailFallback } from "@/src/features/pack/PackDetailFallback";
import { BackButton } from "@/src/shared/components/BackButton";
import { buildOpenGraph } from "@/src/shared/lib/open-graph";
import { SITE_URL } from "@/src/shared/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
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
  const pack = await getPackServer(id);
  if (!pack) return <PackDetailFallback packId={id} />;
  const results = await getResultsServer(id);
  return (
    <>
      <div className="mx-auto w-full max-w-[1120px] px-7 pt-6">
        <BackButton fallbackHref="/" />
      </div>
      <PackDetailScreen pack={pack} results={results} />
    </>
  );
}
