import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileEditForm } from "@/src/features/profile/ProfileEditForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages");
  return { title: t("metaEditProfile") };
}

export default function ProfileEditPage() {
  return <ProfileEditForm />;
}
