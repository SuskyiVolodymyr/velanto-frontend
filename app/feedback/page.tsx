import type { Metadata } from "next";
import { FeedbackScreen } from "@/src/features/feedback/FeedbackScreen";

export const metadata: Metadata = {
  title: "Feedback — Velanto",
  description: "Report bugs, suggest features, and propose translation improvements.",
};

export default function FeedbackPage() {
  return <FeedbackScreen />;
}
