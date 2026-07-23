"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, Eye, EyeOff, Link2 } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

/**
 * The room join code, shown stream-safely. The code is masked by default —
 * never on screen unless the host deliberately reveals it — so a host sharing
 * their screen can invite friends without the code being captured. Copy works
 * without revealing: the host copies the code and pastes it into Discord while
 * the screen still shows dots.
 *
 * The primary action is **Copy invite link** — a `/rooms/join/<code>` URL that
 * drops a friend straight into the room. The link CONTAINS the code, so it is
 * strictly copy-only: it is never rendered on screen (that would defeat the
 * masking) and, unlike the code, has no reveal — it goes clipboard → Discord.
 *
 * This is a stronger guarantee than the streamer-mode <Hidden> primitive, which
 * only redacts while streamer mode is on; here the code is hidden for everyone
 * until an explicit reveal, and the link is never shown at all.
 */
export function JoinCode({ code }: { code: string }) {
  const t = useTranslations("room");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      if (linkTimeout.current) clearTimeout(linkTimeout.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (permissions / insecure context): reveal so the host
      // can read and type it manually.
      setRevealed(true);
    }
  }

  async function handleCopyLink() {
    // Built here (client-only) rather than passed in, so the code never appears
    // in a server-rendered URL. window is safe: JoinCode is "use client" and
    // this only runs on a click.
    const url = `${window.location.origin}/rooms/join/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      if (linkTimeout.current) clearTimeout(linkTimeout.current);
      linkTimeout.current = setTimeout(() => setLinkCopied(false), 1600);
    } catch {
      // Clipboard blocked. Unlike the code, we deliberately do NOT fall back to
      // revealing the link — it contains the code and must never be shown on a
      // shared screen. The host can copy the code instead.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleCopyLink}>
          {linkCopied ? (
            <Check size={16} aria-hidden />
          ) : (
            <Link2 size={16} aria-hidden />
          )}
          {linkCopied ? t("lobby.copied") : t("lobby.copyInviteLink")}
        </Button>
        <span
          data-testid="join-code"
          className={cn(
            "inline-flex min-w-[7rem] items-center justify-center rounded-[10px] border border-border-strong bg-background px-4 py-2 font-mono text-lg tracking-[0.3em]",
            revealed ? "text-foreground" : "text-foreground-tertiary",
          )}
        >
          {revealed ? code : "••••••"}
        </span>
        <Button variant="secondary" onClick={handleCopy}>
          {copied ? (
            <Check size={16} aria-hidden />
          ) : (
            <Copy size={16} aria-hidden />
          )}
          {copied ? t("lobby.copied") : t("lobby.copyCode")}
        </Button>
        <Button
          variant="ghost"
          aria-pressed={revealed}
          onClick={() => setRevealed((v) => !v)}
        >
          {revealed ? (
            <EyeOff size={16} aria-hidden />
          ) : (
            <Eye size={16} aria-hidden />
          )}
          {revealed ? t("lobby.hideCode") : t("lobby.revealCode")}
        </Button>
      </div>
      <Text variant="tertiary" className="text-xs">
        {t("lobby.streamSafeNote")}
      </Text>
    </div>
  );
}
