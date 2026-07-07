import type { Metadata } from "next";
import { AdminScreen } from "@/src/features/admin/AdminScreen";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminPage() {
  return <AdminScreen />;
}
