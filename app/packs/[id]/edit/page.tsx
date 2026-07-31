import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { EditPackScreen } from "@/src/features/create/EditPackScreen";
import { EditPackFallback } from "@/src/features/create/EditPackFallback";

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
    // No page container here — same reasoning as app/create/page.tsx: it
    // would double up with the one CreatePackForm applies to its own sticky
    // bar / body internally, since that bar needs to sit full-bleed. No
    // `pt-10` either — same fix as app/create/page.tsx: dead clearance for a
    // since-removed header block, now just pushing the sticky bar itself
    // down 40px and opening a bare gap above it at scroll 0.
    <main className="flex-1">
      {/* The real mock's sticky bar carries the visible title now (T1) —
          this h1 stays sr-only purely for a11y/SEO landmark purposes. The
          sticky action bar's own icon back-button (inside CreatePackForm,
          via EditPackScreen) replaces the standalone BackButton that used to
          sit here — it points at /packs/{id}, same destination this had. */}
      <h1 className="sr-only">{t("editTitle")}</h1>
      {pack ? <EditPackScreen pack={pack} /> : <EditPackFallback packId={id} />}
    </main>
  );
}
