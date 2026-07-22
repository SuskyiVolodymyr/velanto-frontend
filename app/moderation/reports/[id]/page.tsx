import type { Metadata } from "next";
import { ReportDetailScreen } from "@/src/features/moderation/ReportDetailScreen";
import { BackButton } from "@/src/shared/components/BackButton";

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
  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-7 pt-6">
        <BackButton href="/moderation" />
      </div>
      <ReportDetailScreen reportId={id} />
    </>
  );
}
