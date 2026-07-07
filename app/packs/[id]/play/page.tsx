import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { PlayScreen } from "@/src/features/play/PlayScreen";
import { RankPlayScreen } from "@/src/features/play/RankPlayScreen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
  return { title: pack ? `Playing ${pack.title}` : "Pack not found" };
}

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) notFound();

  return pack.format === "rank_blind" ? <RankPlayScreen pack={pack} /> : <PlayScreen pack={pack} />;
}
