import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { PlayRouter } from "@/src/features/play/PlayRouter";
import { PlayFallback } from "@/src/features/play/PlayFallback";
import { PlayHeader } from "@/src/features/play/PlayHeader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("pages");
  const pack = await getPackServer(id);
  if (!pack)
    return {
      title: t("packNotFound"),
      robots: { index: false, follow: false },
    };
  return { title: t("metaPlaying", { title: pack.title }) };
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) return <PlayFallback packId={id} />;
  return (
    <>
      <PlayHeader packId={id} title={pack.title} />
      <PlayRouter pack={pack} />
    </>
  );
}
