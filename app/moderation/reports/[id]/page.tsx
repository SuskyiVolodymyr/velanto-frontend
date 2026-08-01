import type { Metadata } from "next";
import { ReportDetailScreen } from "@/src/features/moderation/ReportDetailScreen";

export const metadata: Metadata = {
  title: "Report",
  robots: { index: false, follow: false },
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // ReportDetailScreen renders its own sticky PageHeader with the back pill —
  // this route used to stack a second, loose BackButton above it.
  return <ReportDetailScreen reportId={id} />;
}
