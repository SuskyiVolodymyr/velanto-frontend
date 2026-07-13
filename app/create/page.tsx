import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Text } from "@/src/shared/components/Text";
import { CreatePackForm } from "@/src/features/create/CreatePackForm";
import { BackButton } from "@/src/shared/components/BackButton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages");
  return { title: t("createTitle") };
}

export default async function CreatePage() {
  const t = await getTranslations("pages");
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-7 py-10">
      <BackButton fallbackHref="/" className="mb-6" />
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        {t("createTitle")}
      </Text>
      <Text variant="secondary" className="mb-8 max-w-lg">
        {t("createSubtitle")}
      </Text>
      <CreatePackForm />
    </main>
  );
}
