"use client";

import { useTranslations } from "next-intl";
import type { Pack } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { PackCard } from "@/src/features/home/PackCard";

export function HomeFeedResults({
  status,
  packs,
}: {
  status: "loading" | "ready" | "error";
  packs: Pack[];
}) {
  const t = useTranslations("home");

  if (status === "loading")
    return <Text variant="secondary">{t("loading")}</Text>;
  if (status === "error") {
    return <Text className="text-[#ff6b6b]">{t("error")}</Text>;
  }
  if (packs.length === 0) {
    return <Text variant="secondary">{t("empty")}</Text>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {packs.map((pack) => (
        <PackCard key={pack.id} pack={pack} />
      ))}
    </div>
  );
}
