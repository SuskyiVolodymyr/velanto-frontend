"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { setPlayIntent } from "@/src/features/play/play-intent-storage";

/**
 * The pack "Play now" call to action — the full-width primary button at the top
 * of the play panel. Anyone can play a pack (a signed-out play simply isn't
 * recorded; see usePlaySession), so this is always a plain link, no auth gating.
 */
export function PackPlayButton({ packId }: { packId: string }) {
  const t = useTranslations("pack");

  return (
    <Link
      href={`/packs/${packId}/play`}
      // "Play now" always starts fresh, even over an in-progress saved play —
      // a visitor back on the pack's own page clicked Play on purpose, so the
      // destination shouldn't ask. See play-intent-storage.ts.
      onClick={() => setPlayIntent(packId, "restart")}
      className="flex h-[52px] items-center justify-center gap-2.5 rounded-[14px] bg-acc text-[15px] font-bold text-[#07131A] transition-[filter] hover:brightness-110"
    >
      <Play size={16} aria-hidden className="fill-current" />
      {t("playNow")}
    </Link>
  );
}
