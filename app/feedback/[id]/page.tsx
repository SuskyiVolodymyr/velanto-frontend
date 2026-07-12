import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FeedbackDetailScreen } from "@/src/features/feedback/FeedbackDetailScreen";
import { BackButton } from "@/src/shared/components/BackButton";

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
  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-7 pt-6">
        <BackButton fallbackHref="/feedback" />
      </div>
      <FeedbackDetailScreen postId={id} />
    </>
  );
}
