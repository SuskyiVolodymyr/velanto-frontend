import type { Metadata } from "next";
import { PackReviewScreen } from "@/src/features/moderation/PackReviewScreen";
import { BackButton } from "@/src/shared/components/BackButton";

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
  return (
    <>
      <div className="mx-auto w-full max-w-[1180px] px-7 pt-6">
        <BackButton href="/moderation?tab=packs" />
      </div>
      <PackReviewScreen packId={id} />
    </>
  );
}
