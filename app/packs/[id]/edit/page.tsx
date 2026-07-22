import type { Metadata } from "next";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";
import { getTranslations } from "next-intl/server";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { EditPackScreen } from "@/src/features/create/EditPackScreen";
import { EditPackFallback } from "@/src/features/create/EditPackFallback";
import { Text } from "@/src/shared/components/Text";
import { BackButton } from "@/src/shared/components/BackButton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages");
  // Edit pages are per-user and never public — keep them out of the index.
  return { title: t("editTitle"), robots: { index: false, follow: false } };
}

export default async function EditPackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("pages");
  // The anonymous Server fetch sees only public (approved) packs; a pending one
  // (e.g. just re-moderated by an edit) comes back null and is resolved client
  // side by EditPackFallback as the authenticated author.
  const pack = await getPackServer(id);

  return (
    <main className={cn(PACK_CONTAINER, "flex-1 py-10")}>
      <BackButton href={`/packs/${id}`} className="mb-6" />
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        {t("editTitle")}
      </Text>
      <Text variant="secondary" className="mb-8 max-w-lg">
        {t("editSubtitle")}
      </Text>
      {pack ? <EditPackScreen pack={pack} /> : <EditPackFallback packId={id} />}
    </main>
  );
}
