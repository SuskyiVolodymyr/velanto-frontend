import Link from "next/link";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";
import type { Pack } from "@/src/shared/types/pack";

interface PlayFinishedProps {
  isVersus: boolean;
  pickCount: number;
  packId: string;
  format: Pack["format"];
  sideAName?: string;
  sideBName?: string;
}

export function PlayFinished({
  isVersus,
  pickCount,
  packId,
  format,
  sideAName,
  sideBName,
}: PlayFinishedProps) {
  const t = useTranslations("play");

  return (
    <section className="mb-10">
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        {t("finishedTitle")}
      </Text>
      <Text variant="secondary" className="mb-4">
        {isVersus
          ? t("finishedVersus", {
              count: pickCount,
              a: sideAName ?? "",
              b: sideBName ?? "",
            })
          : t(
              format === "sacrifice_one" ? "finishedSacrifice" : "finishedSave",
              { count: pickCount },
            )}
      </Text>
      <Link
        href={`/packs/${packId}/result`}
        className={buttonClassName("primary", "w-fit")}
      >
        {t("seeResult")}
      </Link>
    </section>
  );
}
