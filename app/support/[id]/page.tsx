import { SupportReportScreen } from "@/src/features/support/SupportReportScreen";

export default async function SupportReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupportReportScreen reportId={id} />;
}
