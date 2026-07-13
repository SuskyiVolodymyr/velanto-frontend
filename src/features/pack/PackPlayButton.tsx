"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { buttonClassName } from "@/src/shared/components/Button";

function PlayGlyph() {
  return <Play size={16} aria-hidden className="fill-current" />;
}

/**
 * The pack "Play now" call to action. Anyone can play a pack — a signed-out
 * play simply isn't recorded (see usePlaySession) — so this is always a plain
 * link, no auth gating.
 */
export function PackPlayButton({ packId }: { packId: string }) {
  const t = useTranslations("pack");

  return (
    <Link
      href={`/packs/${packId}/play`}
      className={buttonClassName("primary", "w-fit gap-2.5")}
    >
      <PlayGlyph />
      {t("playNow")}
    </Link>
  );
}
