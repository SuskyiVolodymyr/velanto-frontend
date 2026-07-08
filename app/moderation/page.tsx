import type { Metadata } from "next";
import { ModerationQueueScreen } from "@/src/features/moderation/ModerationQueueScreen";

export const metadata: Metadata = {
  title: "Moderation queue",
  robots: { index: false, follow: false },
};

export default function ModerationPage() {
  return <ModerationQueueScreen />;
}
