"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

interface RoomInvitePanelProps {
  /** Null once the room has released its code (locked, started, or over). */
  code: string | null;
  locked: boolean;
  onLock: (locked: boolean) => void;
}

/**
 * The lobby's Invite code card (Room Lobby.dc.html), shown stream-safely.
 *
 * The code is masked by default — never on screen unless the host deliberately
 * reveals it — so a host sharing their screen can invite friends without the
 * code being captured. Both copy actions work WITHOUT revealing: the host
 * copies straight into Discord while the screen still shows dots.
 *
 * The primary action is the invite LINK (`/rooms/join/<code>`), which drops a
 * friend into the room directly. It contains the code, so it is strictly
 * copy-only: never rendered, and — unlike the code — with no reveal at all.
 *
 * The switch below the divider is the ROOM LOCK, not a masking toggle. The mock
 * labels that row "stream safety", and locking is the half of stream safety
 * that masking can't do: a code already sniped off a shared screen is dead the
 * moment the host closes the lobby. Masking is the eye, and it is the default.
 */
export function RoomInvitePanel({
  code,
  locked,
  onLock,
}: RoomInvitePanelProps) {
  const t = useTranslations("room");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  function flash(what: "code" | "link") {
    setCopied(what);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setCopied(null), 1600);
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      flash("code");
    } catch {
      // Clipboard blocked (permissions / insecure context): reveal so the host
      // can read and type it out manually.
      setRevealed(true);
    }
  }

  async function copyLink() {
    if (!code) return;
    // Built here (client-only) rather than passed in, so the code never appears
    // in a server-rendered URL.
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/rooms/join/${code}`,
      );
      flash("link");
    } catch {
      // Deliberately NO reveal fallback, unlike the code above: the link
      // contains the code and must never be shown on a shared screen.
    }
  }

  return (
    <section
      aria-label={t("lobby.inviteCode")}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface-card p-[18px]"
    >
      <div className="flex items-center gap-[9px]">
        <Text as="h2" className="text-[15px] font-bold">
          {t("lobby.inviteCode")}
        </Text>
        <Text variant="tertiary" className="ms-auto text-[11.5px]">
          {revealed ? t("lobby.codeVisible") : t("lobby.codeHidden")}
        </Text>
      </div>

      {code ? (
        <>
          <div className="flex gap-[9px]">
            <div className="flex h-[46px] min-w-0 flex-1 items-center gap-2.5 rounded-control border border-border-strong bg-background px-3.5">
              <span
                data-testid="join-code"
                className={cn(
                  "flex-1 truncate font-mono text-[17px] font-semibold tracking-[0.2em]",
                  revealed ? "text-foreground" : "text-foreground-tertiary",
                )}
              >
                {revealed ? code : "••••••"}
              </span>
              <button
                type="button"
                onClick={copyCode}
                aria-label={t("lobby.copyCode")}
                className="grid h-[30px] w-[30px] flex-none place-items-center rounded-chip bg-white/[0.07] text-foreground-secondary transition-colors hover:bg-white/[0.14] hover:text-foreground"
              >
                {copied === "code" ? (
                  <Check size={15} aria-hidden />
                ) : (
                  <Copy size={15} aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                aria-pressed={revealed}
                aria-label={
                  revealed ? t("lobby.hideCode") : t("lobby.revealCode")
                }
                className="grid h-[30px] w-[30px] flex-none place-items-center rounded-chip bg-white/[0.07] text-foreground-secondary transition-colors hover:bg-white/[0.14] hover:text-foreground"
              >
                {revealed ? (
                  <EyeOff size={16} aria-hidden />
                ) : (
                  <Eye size={16} aria-hidden />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={copyLink}
              className={cn(
                "h-[46px] flex-none rounded-control px-4 text-[13.5px] font-semibold transition-[filter]",
                copied === "link"
                  ? "bg-live/[0.18] text-live"
                  : "bg-white/[0.09] text-foreground hover:brightness-125",
              )}
            >
              {copied === "link"
                ? t("lobby.copied")
                : t("lobby.copyInviteLink")}
            </button>
          </div>
          <Text variant="tertiary" className="text-[11.5px] leading-[1.45]">
            {t("lobby.streamSafeNote")}
          </Text>
        </>
      ) : (
        <Text variant="tertiary" className="text-xs">
          {t("lobby.codeUnavailable")}
        </Text>
      )}

      <div className="flex items-center gap-[11px] border-t border-border pt-3">
        <button
          type="button"
          role="switch"
          aria-checked={locked}
          onClick={() => onLock(!locked)}
          className={cn(
            "relative h-[26px] w-11 flex-none rounded-full transition-colors",
            locked ? "bg-acc" : "bg-white/[0.14]",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "absolute top-[3px] h-5 w-5 rounded-full bg-white transition-[inset-inline-start] duration-200 ease-signature",
              locked ? "start-[21px]" : "start-[3px]",
            )}
          />
          <span className="sr-only">{t("lobby.lock")}</span>
        </button>
        <div className="flex flex-col gap-0.5">
          <Text className="text-[13px] font-semibold">{t("lobby.lock")}</Text>
          <Text variant="tertiary" className="text-[11.5px]">
            {locked ? t("lobby.lockedNote") : t("lobby.unlockedNote")}
          </Text>
        </div>
      </div>
    </section>
  );
}
