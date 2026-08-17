"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NAV, TOPICS, type TopicId } from "./DocsSidebar";

/** The sidebar's flat order, with each topic's label key — the pager walks it. */
const ORDERED = NAV.flatMap((section) => section.topics);

const BUTTON =
  "flex items-center gap-[9px] rounded-xl border border-white/[0.12] py-2.5 text-foreground transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc";

/**
 * Previous/next topic links under the article, mirroring the mock's footer row.
 * Reading the docs front to back is the common path, and without these the only
 * way forward is back up to the sidebar.
 *
 * Order comes from {@link NAV} — the same list that renders the sidebar and
 * validates `?topic=` — so a topic added there joins the sequence automatically
 * and can't be skipped.
 */
export function DocsPager({
  activeTopic,
  onSelect,
}: {
  activeTopic: TopicId;
  onSelect: (id: TopicId) => void;
}) {
  const t = useTranslations("docs");
  const index = TOPICS.indexOf(activeTopic);
  const previous = index > 0 ? ORDERED[index - 1] : null;
  const next = index < ORDERED.length - 1 ? ORDERED[index + 1] : null;

  if (!previous && !next) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-[18px]">
      {previous && (
        <button
          type="button"
          onClick={() => onSelect(previous.id)}
          className={`${BUTTON} ps-[11px] pe-[14px] text-start`}
        >
          <ChevronLeft
            size={15}
            strokeWidth={2.2}
            aria-hidden
            className="flex-none text-foreground-tertiary rtl:rotate-180"
          />
          <span className="flex flex-col gap-px">
            <span className="text-[10.5px] text-foreground-tertiary">
              {t("previousTopic")}
            </span>
            <span className="text-[13px] font-[650]">
              {t(previous.labelKey)}
            </span>
          </span>
        </button>
      )}
      {next && (
        <button
          type="button"
          onClick={() => onSelect(next.id)}
          className={`${BUTTON} ms-auto ps-[14px] pe-[11px] text-end`}
        >
          <span className="flex flex-col gap-px">
            <span className="text-[10.5px] text-foreground-tertiary">
              {t("nextTopic")}
            </span>
            <span className="text-[13px] font-[650]">{t(next.labelKey)}</span>
          </span>
          <ChevronRight
            size={15}
            strokeWidth={2.2}
            aria-hidden
            className="flex-none text-foreground-tertiary rtl:rotate-180"
          />
        </button>
      )}
    </div>
  );
}
