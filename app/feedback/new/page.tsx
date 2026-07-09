import type { Metadata } from "next";
import { NewFeedbackForm } from "@/src/features/feedback/NewFeedbackForm";

export const metadata: Metadata = {
  title: "New feedback — Velanto",
};

export default function NewFeedbackPage() {
  return <NewFeedbackForm />;
}
