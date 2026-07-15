"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
import type { TopicId } from "./DocsSidebar";

const FORMAT_DOCS = [
  { nameKey: "save_one", descKey: "formatSaveOneDesc" },
  { nameKey: "sacrifice_one", descKey: "formatSacrificeOneDesc" },
  { nameKey: "rank_blind", descKey: "formatRankBlindDesc" },
  { nameKey: "nxn", descKey: "formatNxnDesc" },
  { nameKey: "1v1", descKey: "format1v1Desc" },
];

export function DocsArticle({ activeTopic }: { activeTopic: TopicId }) {
  const t = useTranslations("docs");
  const tFormats = useTranslations("formats");
  return (
    <article className="min-w-0 max-w-2xl flex-1">
      {activeTopic === "start" && (
        <>
          <Text as="h1" variant="title" className="mb-3 text-3xl">
            {t("whatIsTitle")}
          </Text>
          <Text variant="secondary" className="mb-4 leading-7">
            {t("whatIsIntro1")}
          </Text>
          <Text variant="secondary" className="mb-7 leading-7">
            {t("whatIsIntro2")}
          </Text>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                titleKey: "buildCardTitle",
                bodyKey: "buildCardBody",
              },
              {
                titleKey: "playCardTitle",
                bodyKey: "playCardBody",
              },
              {
                titleKey: "compareCardTitle",
                bodyKey: "compareCardBody",
              },
            ].map((card) => (
              <Card
                key={card.titleKey}
                className="hover:translate-y-0 hover:shadow-none"
              >
                <Text className="mb-1.5 font-semibold">{t(card.titleKey)}</Text>
                <Text variant="tertiary" className="text-sm leading-6">
                  {t(card.bodyKey)}
                </Text>
              </Card>
            ))}
          </div>
        </>
      )}

      {activeTopic === "creating" && (
        <>
          <Text as="h1" variant="title" className="mb-3 text-3xl">
            {t("creatingTitle")}
          </Text>
          <Text variant="secondary" className="mb-4 leading-7">
            {t("creatingIntro")}
          </Text>
          <ul className="mb-4 list-disc pl-5">
            <li className="mb-2">
              <Text as="span" className="font-semibold">
                {t("creatingFixedName")}
              </Text>
              <Text as="span" variant="secondary">
                {t("creatingFixedDesc")}
              </Text>
            </li>
            <li>
              <Text as="span" className="font-semibold">
                {t("creatingTagName")}
              </Text>
              <Text as="span" variant="secondary">
                {t("creatingTagDesc")}
              </Text>
            </li>
          </ul>
          <Text variant="secondary" className="leading-7">
            {t("creatingOutro")}
          </Text>
        </>
      )}

      {activeTopic === "formats" && (
        <>
          <Text as="h1" variant="title" className="mb-5 text-3xl">
            {t("formatsTitle")}
          </Text>
          <div className="flex flex-col gap-3">
            {FORMAT_DOCS.map((format) => (
              <Card
                key={format.nameKey}
                className="hover:translate-y-0 hover:shadow-none"
              >
                <Text className="mb-1.5 font-semibold">
                  {tFormats(format.nameKey)}
                </Text>
                <Text variant="secondary" className="text-sm leading-6">
                  {t(format.descKey)}
                </Text>
              </Card>
            ))}
          </div>
        </>
      )}

      {activeTopic === "playing" && (
        <>
          <Text as="h1" variant="title" className="mb-3 text-3xl">
            {t("playingTitle")}
          </Text>
          <Text variant="secondary" className="mb-4 leading-7">
            {t("playingIntro")}
          </Text>
          <Text variant="secondary" className="leading-7">
            {t("playingOutro")}
          </Text>
        </>
      )}

      {activeTopic === "stats" && (
        <>
          <Text as="h1" variant="title" className="mb-3 text-3xl">
            {t("statsTitle")}
          </Text>
          <Text variant="secondary" className="leading-7">
            {t("statsBody")}
          </Text>
        </>
      )}
    </article>
  );
}
