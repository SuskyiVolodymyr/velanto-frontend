import type { Metadata } from "next";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";
import { getTranslations } from "next-intl/server";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { EditPackScreen } from "@/src/features/create/EditPackScreen";
import { EditPackFallback } from "@/src/features/create/EditPackFallback";
import { Text } from "@/src/shared/components/Text";

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
    // No PACK_CONTAINER here — same reasoning as app/create/page.tsx: it
    // would double up with the one CreatePackForm applies to its own sticky
    // bar / body internally, since that bar needs to sit full-bleed.
    <main className="flex-1 pt-10">
      <div className={cn(PACK_CONTAINER)}>
        {/* The sticky action bar's own Cancel link (inside CreatePackForm,
            via EditPackScreen) replaces the standalone BackButton that used
            to sit here — it points at /packs/{id}, same destination this
            had. */}
        <Text
          as="h1"
          variant="title"
          className="mb-2 text-[clamp(30px,3.6vw,40px)] leading-tight"
        >
          {t("editTitle")}
        </Text>
        <Text variant="secondary" className="mb-8 max-w-[520px]">
          {t("editSubtitle")}
        </Text>
      </div>
      {pack ? <EditPackScreen pack={pack} /> : <EditPackFallback packId={id} />}
    </main>
  );
}
