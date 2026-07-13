"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/src/shared/lib/cn";
import { Badge } from "@/src/shared/components/Badge";
import { youtubeThumbnailUrl } from "@/src/shared/lib/youtube";
import { loadYouTubeIframeApi } from "@/src/shared/lib/youtube-iframe-api";
import type { YouTubePlayer } from "@/src/shared/lib/youtube-iframe-api";

interface YouTubeCardProps {
  videoId: string;
  className?: string;
}

export function YouTubeCard({ videoId, className }: YouTubeCardProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [hovered, setHovered] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  // Tears down any player built for a previous videoId so a re-render with a
  // new video (rather than a fresh mount) doesn't leave the old one playing
  // behind a stale "ready" state, and falls back to the new video's own
  // thumbnail instead of staying hidden behind the destroyed player.
  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
      setPlayerReady(false);
    };
  }, [videoId]);

  // Lazily loads the API and constructs the player on first hover only —
  // repeated hovers reuse the same instance via the effect below. A failed
  // load (e.g. blocked by an ad-blocker) is swallowed: the card just stays
  // on the thumbnail, same as if the user never hovered.
  useEffect(() => {
    if (!hovered || playerRef.current) return;
    let cancelled = false;
    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;
        playerRef.current = new YT.Player(mountRef.current, {
          videoId,
          playerVars: { autoplay: 1 },
          events: {
            onReady: () => {
              // Controls (play/pause) only become callable once the player is
              // ready; the hover effect below drives playback off `playerReady`,
              // so play-on-ready is handled there — and a hover that ended
              // before ready never touches a not-yet-a-function control.
              setPlayerReady(true);
            },
          },
        });
      })
      .catch(() => {
        // Intentionally silent — see comment above.
      });
    return () => {
      cancelled = true;
    };
  }, [hovered, videoId]);

  useEffect(() => {
    if (!playerRef.current || !playerReady) return;
    if (hovered) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
  }, [hovered, playerReady]);

  return (
    <div
      data-testid="youtube-card"
      className={cn(
        "relative aspect-video overflow-hidden bg-black",
        className,
      )}
      onMouseEnter={() => setHovered(true)}
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
      <div className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full">
        <div ref={mountRef} />
      </div>
      {!hovered && (
        // Mouse users get autoplay via onMouseEnter above; this button is the
        // equivalent trigger for touch and keyboard users, who can never fire
        // a hover event.
        <button
          type="button"
          onClick={(event) => {
            // A YouTubeCard may sit inside another clickable element (e.g. a
            // pickable side card) — starting the preview must never also
            // trigger that ancestor's own click handler.
            event.stopPropagation();
            setHovered(true);
          }}
          aria-label="Play video preview"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/50">
            <span className="ml-0.5 h-0 w-0 border-y-8 border-l-[12px] border-y-transparent border-l-white" />
          </span>
        </button>
      )}
      <Badge className="absolute left-2 top-2">YouTube</Badge>
    </div>
  );
}
