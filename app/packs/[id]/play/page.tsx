import type { Metadata } from "next";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { PlayRouter } from "@/src/features/play/PlayRouter";
import { PlayFallback } from "@/src/features/play/PlayFallback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) return { title: "Pack not found", robots: { index: false, follow: false } };
  return { title: `Playing ${pack.title}` };
}

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) return <PlayFallback packId={id} />;
  return <PlayRouter pack={pack} />;
}
