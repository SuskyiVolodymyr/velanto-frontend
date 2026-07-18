import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileRedirect } from "@/src/features/profile/ProfileRedirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages");
  // Not indexable — it only bounces the signed-in owner to their /users/[id]
  // page (the canonical, shareable profile URL).
  return { title: t("metaProfile"), robots: { index: false, follow: false } };
}

export default function ProfilePage() {
  return <ProfileRedirect />;
}
