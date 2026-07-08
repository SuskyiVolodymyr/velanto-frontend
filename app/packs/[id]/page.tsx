import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { getResultsServer } from "@/src/shared/lib/get-results-server";
import { PackDetailScreen } from "@/src/features/pack/PackDetailScreen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
  return { title: pack ? pack.title : "Pack not found" };
}

export default async function PackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) notFound();
  const results = await getResultsServer(id);
  return <PackDetailScreen pack={pack} results={results} />;
}
