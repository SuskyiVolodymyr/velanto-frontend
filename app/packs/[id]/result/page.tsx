import type { Metadata } from "next";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { getResultsServer } from "@/src/shared/lib/get-results-server";
import { ResultScreen } from "@/src/features/result/ResultScreen";
import { ResultFallback } from "@/src/features/result/ResultFallback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) return { title: "Pack not found", robots: { index: false, follow: false } };
  return { title: `${pack.title} — Result` };
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) return <ResultFallback packId={id} />;
  const results = await getResultsServer(id);
  return <ResultScreen pack={pack} results={results} />;
}
