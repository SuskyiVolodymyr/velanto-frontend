import type { Metadata } from "next";
import { FeedbackDetailScreen } from "@/src/features/feedback/FeedbackDetailScreen";

export const metadata: Metadata = { title: "Feedback — Velanto" };

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FeedbackDetailScreen postId={id} />;
}
