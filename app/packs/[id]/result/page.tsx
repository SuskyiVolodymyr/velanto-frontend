import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { getResultsServer } from "@/src/shared/lib/get-results-server";
import { ResultScreen } from "@/src/features/result/ResultScreen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
  return { title: pack ? `${pack.title} — Result` : "Pack not found" };
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) notFound();
  const results = await getResultsServer(id);

  return <ResultScreen pack={pack} results={results} />;
}
