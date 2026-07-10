import type { Metadata } from "next";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { getResultsServer } from "@/src/shared/lib/get-results-server";
import { PackDetailScreen } from "@/src/features/pack/PackDetailScreen";
import { PackDetailFallback } from "@/src/features/pack/PackDetailFallback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack)
    return { title: "Pack not found", robots: { index: false, follow: false } };
  return { title: pack.title };
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
  return <PackDetailScreen pack={pack} results={results} />;
}
