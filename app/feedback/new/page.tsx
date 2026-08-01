import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewFeedbackForm } from "@/src/features/feedback/NewFeedbackForm";
import { PageHeader } from "@/src/shared/components/PageHeader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feedback");
  return { title: { absolute: t("metaNewTitle") } };
}

// The mock composes this as a modal titled "New suggestion" over the board; as a
// route it gets the standard back-pill header carrying the same title, and the
// form renders the modal's body and footer beneath it.
export default async function NewFeedbackPage() {
  const t = await getTranslations("feedback");
  return (
    <>
      <PageHeader
        back={{ href: "/feedback", label: t("backToFeedback") }}
        crumb={t("newFeedbackTitle")}
      />
      <NewFeedbackForm />
    </>
  );
}
