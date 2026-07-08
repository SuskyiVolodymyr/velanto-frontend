import type { Metadata } from "next";
import { ProfileEditForm } from "@/src/features/profile/ProfileEditForm";

export const metadata: Metadata = {
  title: "Edit profile",
};

export default function ProfileEditPage() {
  return <ProfileEditForm />;
}
