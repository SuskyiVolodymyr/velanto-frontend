import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileEditForm } from "@/src/features/profile/ProfileEditForm";
import { BackButton } from "@/src/shared/components/BackButton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages");
  return { title: t("metaEditProfile") };
}

export default function ProfileEditPage() {
  return (
    <>
      <div className="mx-auto w-full max-w-md px-7 pt-6">
        <BackButton fallbackHref="/profile" />
      </div>
      <ProfileEditForm />
    </>
  );
}
