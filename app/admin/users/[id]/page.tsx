import type { Metadata } from "next";
import { AdminUserDetailScreen } from "@/src/features/admin/AdminUserDetailScreen";

export const metadata: Metadata = {
  title: "User — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminUserDetailScreen userId={id} />;
}
