"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { PlayIcon } from "@/src/shared/components/icons";
import { Text } from "@/src/shared/components/Text";
import { formatRelativeTimeIntl } from "@/src/shared/lib/relative-time";
import {
  listPlayResumes,
  type PlayResumeRecord,
} from "@/src/features/play/play-resume-storage";
import { setPlayIntent } from "@/src/features/play/play-intent-storage";

/**
 * The packs this browser has an unfinished play for, shown above the History
 * grid so "carry on where you left off" is the first thing on the page.
 *
 * Deliberately NOT merged into the grid below. An unfinished play is a
 * client-only record in localStorage (see play-resume-storage) with a one-week
 * TTL, while the grid is a server-paginated list — there is no way to order or
 * page the two together without lying about the totals. A separate section also
 * says the right thing: these aren't history, they're something you still owe.
 *
 * Client-only by necessity: the records are read AFTER mount, so the component
 * renders nothing on the server or before the read. That keeps the server HTML
 * and first client render identical (no hydration mismatch).
 */
export function InProgressSection({ className }: { className?: string }) {
  const t = useTranslations("history");
  const [records, setRecords] = useState<PlayResumeRecord[] | null>(null);

  // Read the (client-only) records once after mount. A set-state-in-effect, and
  // deliberately so: reading during render would run on the server and diverge
  // on hydration, and useSyncExternalStore doesn't fit — listPlayResumes builds
  // a fresh array each call, breaking its Object.is-stable-snapshot contract
  // (same reasoning as ContinuePlayingRail's identical read).
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setRecords(listPlayResumes());
  }, []);

  // A resume record can survive with a missing/malformed display snapshot (the
  // storage guard only protects the resume-critical fields), so skip any that
  // can't be rendered — those packs are still resumable from their play page.
  const renderable = records?.filter(
    (record) => typeof record.pack?.title === "string",
  );
  if (!renderable || renderable.length === 0) return null;

  return (
    <section className={className}>
      <Text as="h2" className="mb-3 text-[17px] font-bold tracking-[-0.01em]">
        {t("inProgressTitle")}
      </Text>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(262px,1fr))] gap-[18px]">
        {renderable.map((record) => (
          <InProgressCard key={record.packId} record={record} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Shaped like {@link PackCard} — same 18px radius, same 16:10 head, same
 * full-width action button — so the two grids read as one page. The head is a
 * tone swatch rather than the real cover: the resume snapshot stores
 * `coverTone` but not `coverImageKey`.
 */
function InProgressCard({ record }: { record: PlayResumeRecord }) {
  const t = useTranslations("history");
  const locale = useLocale();
  const { title, totalRounds } = record.pack;
  // coverTone is a required Pack field, but this is untrusted storage — fall
  // back so a malformed snapshot never renders an invalid gradient.
  const coverTone = record.pack.coverTone || "#2b2a3a";
  // roundIndex is completed rounds; the player resumes into the next one. The
  // record is only saved with roundIndex < totalRounds, so `current` is in range.
  const safeTotal = Math.max(totalRounds, 1);
  const current = Math.min(record.roundIndex + 1, safeTotal);
  const pct = Math.round((record.roundIndex / safeTotal) * 100);
  const playedAt = new Date(record.updatedAt).toISOString();
  const playedLabel = formatRelativeTimeIntl(playedAt, locale);

  return (
    <li className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-surface-card transition-[transform,border-color] duration-200 ease-[cubic-bezier(0.2,0.7,0.3,1)] hover:-translate-y-[3px] hover:border-white/[0.18]">
      <div
        className="relative isolate aspect-[16/10]"
        style={{ background: `linear-gradient(150deg, ${coverTone}, #0b0c0f)` }}
      >
        <span className="absolute start-3 top-3 rounded-[7px] bg-black/50 px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.04em] text-acc backdrop-blur-sm">
          {t("inProgressBadge")}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-[7px] p-[14px]">
        <Text as="h3" className="text-[15px] font-[650] leading-snug">
          {title}
        </Text>
        <div className="mt-auto flex flex-col gap-1.5 pt-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-acc"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Text variant="tertiary" className="text-[11.5px]">
              {t("progress", { current, total: safeTotal })}
            </Text>
            {playedLabel && (
              <Text
                variant="tertiary"
                className="ms-auto shrink-0 text-[11.5px]"
              >
                <time dateTime={playedAt} suppressHydrationWarning>
                  {playedLabel}
                </time>
              </Text>
            )}
          </div>
        </div>
      </div>

      <div className="px-[14px] pb-[14px]">
        <Link
          href={`/packs/${record.packId}/play`}
          // This card's whole point is resuming exactly where the player left
          // off — clicking it must never route through the resume-choice modal.
          // See play-intent-storage.ts.
          onClick={() => setPlayIntent(record.packId, "continue")}
          className="flex h-[38px] w-full items-center justify-center gap-2 rounded-[11px] bg-acc text-[13px] font-[650] text-[#07131a] transition-colors hover:brightness-110"
        >
          <PlayIcon size={15} />
          {t("continue")}
        </Link>
      </div>
    </li>
  );
}
