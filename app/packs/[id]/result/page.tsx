import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
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
  // noindex since #243, replacing the canonical that used to live here.
  //
  // The canonical (#67/#73) existed to consolidate the per-viewer `?p=<picks>`
  // share variants onto "one indexable URL". #222 made that rationale obsolete:
  // this page shows nothing to anyone who hasn't played, so the URL it was
  // consolidating onto now renders "Finish the pack to see the results" to every
  // crawler, permanently. Consolidating an index entry onto a page that can
  // never serve a search visitor is worse than having no entry.
  //
  // noindex also does the de-duplication job the canonical was there for, and
  // does it better: every `?p=` variant is covered by the same rule, with no
  // contradictory-signals problem (the canonical is dropped rather than paired
  // with noindex — Google treats that combination as conflicting, which is what
  // #73 was avoiding).
  //
  // `follow: true`: the page links to the pack and the author, and those are
  // worth crawling. It is this URL that shouldn't be a search result, not the
  // things it points at.
  return {
    title: t("metaResult", { title: pack.title }),
    robots: { index: false, follow: true },
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
  // The pack is still fetched here — it supplies the <title> and the locked
  // screen's heading, so the page is not an empty shell. The RESULTS are not:
  // ResultScreen fetches those itself, only once it knows they will be shown
  // (#243).
  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-7 pt-6">
        <BackButton fallbackHref={`/packs/${id}`} />
      </div>
      <ResultScreen pack={pack} />
    </>
  );
}
