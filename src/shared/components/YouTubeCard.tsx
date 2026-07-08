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
            onReady: (event) => {
              event.target.playVideo();
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
    if (!playerRef.current) return;
    if (hovered) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
  }, [hovered]);

  useEffect(() => {
    return () => playerRef.current?.destroy();
  }, []);

  return (
    <div
      data-testid="youtube-card"
      className={cn("relative h-[150px] overflow-hidden bg-black", className)}
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
      <div ref={mountRef} className="absolute inset-0" />
      {!hovered && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/50">
            <span className="ml-0.5 h-0 w-0 border-y-8 border-l-[12px] border-y-transparent border-l-white" />
          </span>
        </span>
      )}
      <Badge className="absolute left-2 top-2">YouTube</Badge>
    </div>
  );
}
