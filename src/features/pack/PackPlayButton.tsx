"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { buttonClassName } from "@/src/shared/components/Button";
import { Tooltip } from "@/src/shared/components/Tooltip";

function PlayGlyph() {
  return <Play size={16} aria-hidden className="fill-current" />;
}

/**
 * The pack "Play now" call to action. Playing requires an account (see
 * PlayScreen), so a *known* signed-out viewer gets a blocked button with a
 * "Log in to play" tooltip instead of a link that dead-ends on a login prompt.
 * During the auth-refresh `loading` phase we keep the link (no login flash).
 */
export function PackPlayButton({ packId }: { packId: string }) {
  const t = useTranslations("pack");
  const tAuth = useTranslations("authGate");
  const { status } = useAuth();

  if (status === "unauthenticated") {
    return (
      <Tooltip content={tAuth("logInToPlay")}>
        <button
          type="button"
          aria-disabled
          className={buttonClassName(
            "primary",
            "w-fit cursor-not-allowed gap-2.5 opacity-45",
          )}
        >
          <PlayGlyph />
          {t("playNow")}
        </button>
      </Tooltip>
    );
  }

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
