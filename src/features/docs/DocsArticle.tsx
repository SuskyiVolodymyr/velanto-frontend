"use client";

import { useTranslations } from "next-intl";
import { BarChart3, EyeOff, Pencil } from "lucide-react";
import { ApiDocs } from "./ApiDocs";
import { DocsNote, H1, PANEL, PROSE } from "./docs-primitives";
import { DocsPager } from "./DocsPager";
import type { TopicId } from "./DocsSidebar";

const FORMAT_DOCS = [
  { nameKey: "save_one", code: "save_one", descKey: "formatSaveOneDesc" },
  {
    nameKey: "sacrifice_one",
    code: "sacrifice_one",
    descKey: "formatSacrificeOneDesc",
  },
  { nameKey: "rank_blind", code: "rank_blind", descKey: "formatRankBlindDesc" },
  { nameKey: "nxn", code: "nxn", descKey: "formatNxnDesc" },
  { nameKey: "1v1", code: "1v1", descKey: "format1v1Desc" },
];

/** Per-card accent, matching the mock's three hues on the overview cards. */
const OVERVIEW_CARDS = [
  {
    titleKey: "buildCardTitle",
    bodyKey: "buildCardBody",
    Icon: Pencil,
    tone: "bg-acc/[0.12] text-acc",
  },
  {
    titleKey: "playCardTitle",
    bodyKey: "playCardBody",
    Icon: EyeOff,
    tone: "bg-[rgba(255,92,192,0.12)] text-[#FF5CC0]",
  },
  {
    titleKey: "compareCardTitle",
    bodyKey: "compareCardBody",
    Icon: BarChart3,
    tone: "bg-success/[0.12] text-success",
  },
];

export function DocsArticle({
  activeTopic,
  onSelect,
}: {
  activeTopic: TopicId;
  onSelect: (id: TopicId) => void;
}) {
  const t = useTranslations("docs");
  const tFormats = useTranslations("formats");
  return (
    <article className="flex min-w-0 flex-1 flex-col gap-[18px]">
      {activeTopic === "start" && (
        <>
          <h1 className={H1}>{t("whatIsTitle")}</h1>
          <p className={PROSE}>{t("whatIsIntro1")}</p>
          <p className={PROSE}>{t("whatIsIntro2")}</p>
          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3">
            {OVERVIEW_CARDS.map((card) => (
              <div
                key={card.titleKey}
                className={`${PANEL} flex flex-col gap-2 p-4`}
              >
                <span
                  aria-hidden
                  className={`grid h-[30px] w-[30px] place-items-center rounded-[10px] ${card.tone}`}
                >
                  <card.Icon size={15} strokeWidth={1.9} />
                </span>
                <span className="text-sm font-[650] text-foreground">
                  {t(card.titleKey)}
                </span>
                <span className="text-[12.5px] leading-[1.55] text-pretty text-foreground-tertiary">
                  {t(card.bodyKey)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTopic === "creating" && (
        <>
          <h1 className={H1}>{t("creatingTitle")}</h1>
          <p className={PROSE}>{t("creatingIntro")}</p>
          {/* Mock: the two layers are "step" panels, not a bulleted list —
              they're the structure of a pack, not a list of caveats. */}
          <div className="flex flex-col gap-[11px]">
            {[
              { n: 1, name: "creatingPoolName", desc: "creatingPoolDesc" },
              { n: 2, name: "creatingRoundName", desc: "creatingRoundDesc" },
            ].map((step) => (
              <div
                key={step.n}
                className={`${PANEL} flex gap-[13px] p-[15px_16px]`}
              >
                <span
                  aria-hidden
                  className="grid h-[26px] w-[26px] flex-none place-items-center rounded-lg bg-acc/[0.12] font-mono text-xs font-bold text-acc"
                >
                  {step.n}
                </span>
                {/* One flowing line, not the mock's title/body pair: our copy
                    is authored as "Pools — named bags of items…", so the
                    localized description already opens with its own separator
                    and would read as a stray dash on a line of its own. */}
                <p className="min-w-0 text-[13.5px] leading-[1.6] text-pretty text-foreground-tertiary">
                  <span className="font-[650] text-foreground">
                    {t(step.name)}
                  </span>
                  {t(step.desc)}
                </p>
              </div>
            ))}
          </div>
          <p className={PROSE}>{t("creatingModesPara")}</p>
          <p className={PROSE}>{t("creatingLimitsPara")}</p>
          <p className={PROSE}>{t("creatingItemsPara")}</p>
          <DocsNote>{t("creatingPublishPara")}</DocsNote>
        </>
      )}

      {activeTopic === "formats" && (
        <>
          <h1 className={H1}>{t("formatsTitle")}</h1>
          <div className="flex flex-col gap-[11px]">
            {FORMAT_DOCS.map((format) => (
              <div
                key={format.nameKey}
                className={`${PANEL} flex flex-col gap-2 p-[16px_18px]`}
              >
                <div className="flex flex-wrap items-center gap-[9px]">
                  <span className="text-[15px] font-bold tracking-[-0.01em] text-foreground">
                    {tFormats(format.nameKey)}
                  </span>
                  <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[10.5px] font-[650] text-foreground-tertiary">
                    {format.code}
                  </span>
                </div>
                <span className="text-[13.5px] leading-[1.65] text-pretty text-foreground-secondary">
                  {t(format.descKey)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTopic === "playing" && (
        <>
          <h1 className={H1}>{t("playingTitle")}</h1>
          <p className={PROSE}>{t("playingIntro")}</p>
          <p className={PROSE}>{t("playingOutro")}</p>
          <p className={PROSE}>{t("statsAnonNote")}</p>
        </>
      )}

      {activeTopic === "stats" && (
        <>
          <h1 className={H1}>{t("statsTitle")}</h1>
          <p className={PROSE}>{t("statsBody")}</p>
          <p className={PROSE}>{t("statsAnonNote")}</p>
        </>
      )}

      {activeTopic === "api" && <ApiDocs />}

      <DocsPager activeTopic={activeTopic} onSelect={onSelect} />
    </article>
  );
}
