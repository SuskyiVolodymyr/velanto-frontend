import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FeedbackScreen } from "@/src/features/feedback/FeedbackScreen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feedback");
  return {
    title: { absolute: t("metaListTitle") },
    description: t("metaListDescription"),
  };
}

export default function FeedbackPage() {
  return <FeedbackScreen />;
}
