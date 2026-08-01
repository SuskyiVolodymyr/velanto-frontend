import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PackReviewOutcomeScreen } from "@/src/features/create/PackReviewOutcomeScreen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reviewOutcome");
  // Author-only and never public — the moderator's message is written for one
  // person. Keep it out of the index for the same reason /packs/[id]/edit is.
  return { title: t("crumb"), robots: { index: false, follow: false } };
}

/**
 * What the moderation team asked this pack's author to change.
 *
 * Client-rendered rather than server-fetched: the pack is in
 * `changes_requested`, which the anonymous Server fetch can't see at all
 * (findById 404s a non-approved pack for everyone but the author and staff),
 * so the screen resolves it as the signed-in author.
 */
export default async function PackReviewOutcomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PackReviewOutcomeScreen packId={id} />;
}
