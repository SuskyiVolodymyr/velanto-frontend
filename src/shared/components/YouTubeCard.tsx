"use client";

import { useEffect, useRef, useState } from "react";
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

interface YouTubeCardProps {
  videoId: string;
  className?: string;
}

export function YouTubeCard({ videoId, className }: YouTubeCardProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  // Flips true once the player reports buffering/playing — proof that commanded
  // playback actually took, so the watchdog below knows not to fall back.
  const playbackStartedRef = useRef(false);
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
          playerVars: { autoplay: 0 },
          events: {
            // Controls (play/pause) only become callable once the player is
            // ready; the hover effect below drives playback off `playerReady`.
            onReady: () => setPlayerReady(true),
            onError: () => setFailed(true),
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
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId, activated]);

  useEffect(() => {
    if (!playerRef.current || !playerReady || failed) return;
    if (!hovered) {
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
          aria-label="Play video preview"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/50">
            <span className="ml-0.5 h-0 w-0 border-y-8 border-l-[12px] border-y-transparent border-l-white" />
          </span>
        </button>
      )}
      {failed && (
        // The video won't embed — offer to open it on YouTube instead of
        // showing YouTube's red error box. stopPropagation so opening it doesn't
        // also trigger a surrounding pickable card.
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/70 px-3 text-center"
        >
          <span className="text-[11px] text-white/70">
            This video can’t play here
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-white">
            Open on YouTube
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          </span>
        </a>
      )}
      <Badge className="absolute left-2 top-2">YouTube</Badge>
    </div>
  );
}
