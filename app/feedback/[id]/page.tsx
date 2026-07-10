import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FeedbackDetailScreen } from "@/src/features/feedback/FeedbackDetailScreen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feedback");
  return { title: { absolute: t("metaListTitle") } };
}

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FeedbackDetailScreen postId={id} />;
}
