import type { Metadata } from "next";
import { NotificationsScreen } from "@/src/features/notifications/NotificationsScreen";

// The phone bottom nav's Notifications tab. noindex: personal + auth-gated.
export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return <NotificationsScreen />;
}
