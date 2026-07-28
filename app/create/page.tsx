import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";
import { Text } from "@/src/shared/components/Text";
import { CreatePackForm } from "@/src/features/create/CreatePackForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages");
  return { title: t("createTitle") };
}

export default async function CreatePage() {
  const t = await getTranslations("pages");
  return (
    // No PACK_CONTAINER here: CreatePackForm's sticky action bar needs to sit
    // full-bleed (edge to edge, like PackDetailScreen's own sticky bar), so
    // the width constraint is applied once, per-block, below — not on this
    // wrapper. Nesting PACK_CONTAINER here AND inside CreatePackForm would
    // double-apply its `lg:w-[70%]`, squashing the whole page.
    <main className="flex-1 pt-10">
      <div className={cn(PACK_CONTAINER)}>
        {/* The sticky action bar's own Cancel link (inside CreatePackForm,
            right below this header) replaces the standalone BackButton that
            used to sit here. */}
        <Text
          as="h1"
          variant="title"
          className="mb-2 text-[clamp(30px,3.6vw,40px)] leading-tight"
        >
          {t("createTitle")}
        </Text>
        <Text variant="secondary" className="mb-8 max-w-[520px]">
          {t("createSubtitle")}
        </Text>
      </div>
      <CreatePackForm />
    </main>
  );
}
