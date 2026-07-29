import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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
    //
    // No `pt-10` either: that was clearance for a since-removed visible
    // header block (see the h1 comment below) — CreatePackForm's own sticky
    // bar is now the first thing here, so the padding just pushed it down
    // 40px past the viewport top, opening a bare gap above it at scroll 0.
    <main className="flex-1">
      {/* The real mock's sticky bar carries the visible title now (T1) —
          this h1 stays sr-only purely for a11y/SEO landmark purposes,
          replacing what used to be a visible header block here. The sticky
          action bar's own icon back-button (inside CreatePackForm) replaces
          the standalone BackButton that used to sit here too. */}
      <h1 className="sr-only">{t("createTitle")}</h1>
      <CreatePackForm />
    </main>
  );
}
