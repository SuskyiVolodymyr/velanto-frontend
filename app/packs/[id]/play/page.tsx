import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { PlayRouter } from "@/src/features/play/PlayRouter";
import { PlayFallback } from "@/src/features/play/PlayFallback";
import { BackButton } from "@/src/shared/components/BackButton";

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
      <div className="mx-auto w-full max-w-2xl px-7 pt-6">
        <BackButton fallbackHref={`/packs/${id}`} />
      </div>
      <PlayRouter pack={pack} />
    </>
  );
}
