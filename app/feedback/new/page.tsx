import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewFeedbackForm } from "@/src/features/feedback/NewFeedbackForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feedback");
  return { title: { absolute: t("metaNewTitle") } };
}

export default function NewFeedbackPage() {
  return <NewFeedbackForm />;
}
