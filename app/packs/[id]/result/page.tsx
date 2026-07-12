import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { getResultsServer } from "@/src/shared/lib/get-results-server";
import { ResultScreen } from "@/src/features/result/ResultScreen";
import { ResultFallback } from "@/src/features/result/ResultFallback";
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
  // Canonicalize to the bare result path so the per-viewer `?p=<picks>` share
  // variants (see share-url.ts / #67) consolidate onto one indexable URL
  // instead of bloating the index with near-duplicates. Canonical alone —
  // deliberately no `noindex` on `?p=`, since Google treats canonical + noindex
  // on the same URL as contradictory signals. See #73.
  return {
    title: t("metaResult", { title: pack.title }),
    alternates: { canonical: `/packs/${id}/result` },
  };
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) return <ResultFallback packId={id} />;
  const results = await getResultsServer(id);
  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-7 pt-6">
        <BackButton fallbackHref={`/packs/${id}`} />
      </div>
      <ResultScreen pack={pack} results={results} />
    </>
  );
}
