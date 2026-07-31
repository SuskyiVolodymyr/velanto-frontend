import type { Metadata } from "next";
import { PackReviewScreen } from "@/src/features/moderation/PackReviewScreen";

export const metadata: Metadata = {
  title: "Pack review",
  robots: { index: false, follow: false },
};

export default async function PackReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // PackReviewScreen renders its own sticky PageHeader with the back pill — this
  // route used to stack a second, loose BackButton above it.
  return <PackReviewScreen packId={id} />;
}
