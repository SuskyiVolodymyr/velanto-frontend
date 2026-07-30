"use client";

import { useTranslations } from "next-intl";
import type { PackSummary } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { PackCard } from "@/src/features/home/PackCard";

export function HomeFeedResults({
  status,
  packs,
}: {
  status: "loading" | "ready" | "error";
  packs: PackSummary[];
}) {
  const t = useTranslations("home");

  if (status === "loading")
    return <LoadingState label={t("loading")} showLabel />;
  if (status === "error") {
    return <Text variant="danger">{t("error")}</Text>;
  }
  if (packs.length === 0) {
    return <Text variant="secondary">{t("empty")}</Text>;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(262px,1fr))] gap-[18px]">
      {packs.map((pack) => (
        <PackCard key={pack.id} pack={pack} />
      ))}
    </div>
  );
}
