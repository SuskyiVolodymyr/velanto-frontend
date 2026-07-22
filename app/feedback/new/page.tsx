import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewFeedbackForm } from "@/src/features/feedback/NewFeedbackForm";
import { BackButton } from "@/src/shared/components/BackButton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feedback");
  return { title: { absolute: t("metaNewTitle") } };
}

export default function NewFeedbackPage() {
  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-7 pt-6">
        <BackButton href="/feedback" />
      </div>
      <NewFeedbackForm />
    </>
  );
}
