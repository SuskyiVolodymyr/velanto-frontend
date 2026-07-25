"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import {
  listPlayResumes,
  type PlayResumeRecord,
} from "@/src/features/play/play-resume-storage";

/**
 * The "Continue playing" dashboard section: a grid of the packs this browser has
 * an in-progress single-player play for (see play-resume-storage). Each card
 * resumes the play where it was left — same rounds, same items, picks intact —
 * via the seeded draw.
 *
 * Client-only by necessity: the records live in localStorage, so the list is
 * read AFTER mount and the component renders nothing on the server or before the
 * read. That keeps the server HTML and first client render identical (no
 * hydration mismatch) and leaves the indexable home page's crawlable content
 * untouched — the rail is purely personal, per-device, and non-SEO.
 */
export function ContinuePlayingRail() {
  const t = useTranslations("home.continue");
  const [records, setRecords] = useState<PlayResumeRecord[] | null>(null);

  // Read the (client-only) records once after mount. A set-state-in-effect, and
  // deliberately so: reading during render would run on the server and diverge
  // on hydration, and useSyncExternalStore doesn't fit — listPlayResumes builds
  // a fresh array each call, breaking its Object.is-stable-snapshot contract
  // (same reasoning as use-home-feed's hydration read).
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setRecords(listPlayResumes());
  }, []);

  if (!records || records.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" className="text-[17px] font-bold tracking-[-0.01em]">
        {t("title")}
      </Text>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
        {records.map((record) => (
          <ContinuePlayingCard key={record.packId} record={record} />
        ))}
      </ul>
    </section>
  );
}

function ContinuePlayingCard({ record }: { record: PlayResumeRecord }) {
  const t = useTranslations("home.continue");
  const { title, coverTone, totalRounds } = record.pack;
  // roundIndex is completed rounds; the player resumes into the next one. The
  // record is only saved with roundIndex < totalRounds, so `current` is in range.
  const safeTotal = Math.max(totalRounds, 1);
  const current = Math.min(record.roundIndex + 1, safeTotal);
  const pct = Math.round((record.roundIndex / safeTotal) * 100);

  return (
    <li className="flex items-center gap-3 rounded-[15px] border border-white/[0.07] bg-surface-card p-3 transition-colors hover:border-white/[0.16]">
      {/* A tone swatch, not the pack's full cover — matches the compact rail. */}
      <span
        aria-hidden
        className="size-[52px] shrink-0 rounded-[11px]"
        style={{ background: `linear-gradient(150deg, ${coverTone}, #0b0c0f)` }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Text className="truncate text-[13.5px] font-semibold">{title}</Text>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-acc"
            style={{ width: `${pct}%` }}
          />
        </div>
        <Text variant="tertiary" className="text-[11.5px]">
          {t("progress", { current, total: totalRounds })}
        </Text>
      </div>
      <Link
        href={`/packs/${record.packId}/play`}
        aria-label={t("resume", { title })}
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.08] text-foreground transition-colors hover:bg-acc hover:text-[#07131A]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="currentColor"
          aria-hidden
        >
          <path d="M3.5 2.2v9.6a.6.6 0 0 0 .92.5l7.3-4.8a.6.6 0 0 0 0-1L4.42 1.7a.6.6 0 0 0-.92.5Z" />
        </svg>
      </Link>
    </li>
  );
}
