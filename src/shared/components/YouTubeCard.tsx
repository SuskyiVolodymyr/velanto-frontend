"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { cn } from "@/src/shared/lib/cn";
import { Badge } from "@/src/shared/components/Badge";
import { youtubeThumbnailUrl } from "@/src/shared/lib/youtube";
import { loadYouTubeIframeApi } from "@/src/shared/lib/youtube-iframe-api";
import {
  YT_STATE_PLAYING,
  YT_STATE_BUFFERING,
} from "@/src/shared/lib/youtube-iframe-api";
import type { YouTubePlayer } from "@/src/shared/lib/youtube-iframe-api";

// How long to wait, after commanding playback, for the video to actually reach
// buffering/playing before we treat it as failed. YouTube's server-side "try
// again later" throttle renders inside the player WITHOUT firing onError, so
// this watchdog is the only signal we get for it.
const PLAYBACK_WATCHDOG_MS = 4000;

// How long a video that WAS playing gets to recover after an onError before we
// give up on it (#349). YouTube fires onError mid-playback on videos that carry
// right on playing; treating that as fatal painted "this video can't play here"
// over a video the viewer was watching. Shorter than the watchdog above: this
// one runs while YouTube's own error box is on screen, so it's a visible pause,
// where the watchdog runs over our thumbnail.
const ERROR_RECOVERY_MS = 1500;

interface YouTubeCardProps {
  videoId: string;
  /**
   * Whole seconds to begin playback at, from a `t=`/`start=` on the author's
   * pasted link. Null/absent plays from the beginning.
   */
  startSeconds?: number | null;
  className?: string;
}

export function YouTubeCard({
  videoId,
  startSeconds,
  className,
}: YouTubeCardProps) {
  const t = useTranslations("media");
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  // Flips true once the player reports buffering/playing — proof that commanded
  // playback actually took, so the watchdog below knows not to fall back.
  const playbackStartedRef = useRef(false);
  // Pending "did it recover?" check from an onError raised mid-playback.
  const errorRecoveryRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The card is a thumbnail facade until the viewer engages with it (hover or
  // the play button). Only THEN do we build a real YouTube player. This is the
  // whole point: a round with N videos loads N cheap thumbnails, not N embedded
  // players, so it never trips YouTube's "too many embeds → try again later"
  // throttle on mount — the player is built on demand, for the one you watch.
  const [activated, setActivated] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  // The video can't be played embedded (private/deleted/embed-disabled/region-
  // or age-restricted, or the server throttle). We fall back to the thumbnail +
  // an "open on YouTube" link instead of leaving YouTube's error box in the card.
  const [failed, setFailed] = useState(false);

  // When the video changes (e.g. rank_blind advancing to the next item) reset
  // back to the un-activated thumbnail, synchronously during render (React's
  // "adjusting state on a prop change" pattern), so the new video also loads
  // lazily instead of eagerly building a player the viewer may never watch.
  const [renderedVideoId, setRenderedVideoId] = useState(videoId);
  if (videoId !== renderedVideoId) {
    setRenderedVideoId(videoId);
    setActivated(false);
    setHovered(false);
    setPlayerReady(false);
    setFailed(false);
  }

  // Build the player only once activated (autoplay:0 — the hover effect below is
  // the only thing that starts playback); tear it down on deactivation/unmount.
  // A failed API load (e.g. blocked by an ad-blocker) is swallowed: the card
  // just stays on the thumbnail.
  useEffect(() => {
    if (!activated) return;
    // Fresh player for this video — it hasn't started playing yet.
    playbackStartedRef.current = false;
    let cancelled = false;
    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;
        playerRef.current = new YT.Player(mountRef.current, {
          videoId,
          // `start` is spread in rather than set to 0 when absent: the IFrame
          // API treats the key's presence as meaningful, and there is no
          // difference to express between "no timecode" and "start at 0".
          playerVars: {
            autoplay: 0,
            ...(startSeconds ? { start: startSeconds } : {}),
          },
          events: {
            // Controls (play/pause) only become callable once the player is
            // ready; the hover effect below drives playback off `playerReady`.
            onReady: () => setPlayerReady(true),
            // A video that has never played can't be embedded — fall back at
            // once. One that HAS played is a different claim: "can't play here"
            // over a running video is simply false, and YouTube raises errors
            // mid-playback that the player recovers from on its own. So clear
            // the started flag and give it a moment: any further buffering or
            // playing sets the flag again and this timer finds nothing to do.
            onError: () => {
              if (!playbackStartedRef.current) {
                setFailed(true);
                return;
              }
              playbackStartedRef.current = false;
              clearTimeout(errorRecoveryRef.current);
              errorRecoveryRef.current = setTimeout(() => {
                if (!playbackStartedRef.current) setFailed(true);
              }, ERROR_RECOVERY_MS);
            },
            onStateChange: (event) => {
              // Reaching buffering/playing means playback actually took — the
              // watchdog must not then fall back.
              if (
                event.data === YT_STATE_PLAYING ||
                event.data === YT_STATE_BUFFERING
              ) {
                playbackStartedRef.current = true;
              }
            },
          },
        });
      })
      .catch(() => {
        // Intentionally silent — see comment above.
      });
    return () => {
      cancelled = true;
      clearTimeout(errorRecoveryRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // startSeconds is a dependency because `start` is only read when the player
    // is CONSTRUCTED — a changed offset has no effect on a live player, so the
    // player has to be rebuilt. In practice it moves in lockstep with videoId
    // (both are derived from the same item.value), so this rarely fires alone.
  }, [videoId, startSeconds, activated]);

  useEffect(() => {
    if (!playerRef.current || !playerReady || failed) return;
    if (!hovered) {
      // Drop any pending recovery check with it: our own pause is about to look
      // exactly like "it never recovered", and a viewer who has moved on isn't
      // owed a verdict. Re-hovering re-arms the watchdog below anyway.
      clearTimeout(errorRecoveryRef.current);
      playerRef.current.pauseVideo();
      return;
    }
    playerRef.current.playVideo();
    // Watchdog for the throttle case (see PLAYBACK_WATCHDOG_MS): if playback
    // hasn't reached buffering/playing by the deadline, give up and show the
    // Open-on-YouTube fallback instead of YouTube's raw error box.
    const watchdog = setTimeout(() => {
      if (!playbackStartedRef.current) setFailed(true);
    }, PLAYBACK_WATCHDOG_MS);
    return () => clearTimeout(watchdog);
  }, [hovered, playerReady, failed]);

  // Engaging the card builds the player (if not already) and plays it.
  function activate() {
    setActivated(true);
    setHovered(true);
  }

  return (
    <div
      data-testid="youtube-card"
      className={cn(
        "relative aspect-video overflow-hidden bg-black",
        className,
      )}
      onMouseEnter={activate}
      onMouseLeave={() => setHovered(false)}
    >
      {!playerReady && (
        // eslint-disable-next-line @next/next/no-img-element -- external, per-video thumbnail; not worth an images.remotePatterns entry for one small preview
        <img
          src={youtubeThumbnailUrl(videoId)}
          alt="YouTube video thumbnail"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* YT.Player replaces the element handed to it with an <iframe>, detaching
          it from React's tree. mountRef is that sacrificial node; this wrapper
          is what React actually reconciles against, so a re-render (e.g. the
          thumbnail reappearing after videoId changes) never has to touch — or
          insertBefore relative to — a node YouTube has already ripped out.
          YT sizes the iframe 640×360 by default; force it to fill the box so
          the video isn't clipped and its controls stay on-screen. */}
      <div
        className={cn(
          "absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full",
          failed && "invisible",
        )}
      >
        <div ref={mountRef} />
      </div>
      {!hovered && !failed && (
        // Mouse users start the preview by hovering (the effect above plays it);
        // this button is the equivalent trigger for touch and keyboard users,
        // who can never fire a hover event.
        <button
          type="button"
          onClick={(event) => {
            // A YouTubeCard may sit inside another clickable element (e.g. a
            // pickable side card) — starting the preview must never also
            // trigger that ancestor's own click handler.
            event.stopPropagation();
            activate();
          }}
          aria-label={t("playPreview")}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/50">
            {/*
              The play triangle: a zero-size box whose left border IS the shape.
              `border-l` and `ml-0.5` are physical on purpose and must stay that
              way — the border draws the glyph rather than framing it, so a
              logical `border-s` would flip the triangle to point backwards
              under RTL, and `ml-0.5` is optical centering for a shape whose
              visual mass sits left of its box. Play controls don't mirror
              (YouTube's own player doesn't), so there is nothing to flip here.
            */}
            <span className="ml-0.5 h-0 w-0 border-y-8 border-l-[12px] border-y-transparent border-l-white" />
          </span>
        </button>
      )}
      {failed && (
        // The video won't embed — offer to open it on YouTube instead of
        // showing YouTube's red error box. stopPropagation so opening it doesn't
        // also trigger a surrounding pickable card.
        <a
          // Carry the timecode here too — this is the escape hatch for a video
          // that won't embed, and sending the viewer to 0:00 of a two-hour
          // upload the author meant to clip is the same bug, just relocated.
          href={`https://www.youtube.com/watch?v=${videoId}${
            startSeconds ? `&t=${startSeconds}` : ""
          }`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/70 px-3 text-center"
        >
          <span className="text-[11px] text-white/70">{t("embedFailed")}</span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-white">
            {t("openOnYouTube")}
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          </span>
        </a>
      )}
      <Badge className="absolute left-2 top-2">YouTube</Badge>
    </div>
  );
}
