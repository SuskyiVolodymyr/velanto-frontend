import { SupportReportScreen } from "@/src/features/support/SupportReportScreen";
import { BackButton } from "@/src/shared/components/BackButton";

export default async function SupportReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-7 pt-6">
        <BackButton fallbackHref="/support" />
      </div>
      <SupportReportScreen reportId={id} />
    </>
  );
}
