import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FeedbackDetailScreen } from "@/src/features/feedback/FeedbackDetailScreen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feedback");
  return { title: { absolute: t("metaListTitle") } };
}

// The screen renders its own sticky PageHeader with the back pill; this page is
// just the route seam. (It used to stack a second, loose BackButton above that
// header, which showed up as two back controls on the same screen.)
export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FeedbackDetailScreen postId={id} />;
}
