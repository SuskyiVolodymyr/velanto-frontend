export interface YouTubePlayerEvent {
  target: YouTubePlayer;
  // Present on onStateChange events: the new YT.PlayerState value.
  data?: number;
}

export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

// YT.PlayerState values we care about — a video that reaches either of these
// after we command playback has actually started (i.e. wasn't throttled).
export const YT_STATE_PLAYING = 1;
export const YT_STATE_BUFFERING = 3;

export interface YouTubePlayerOptions {
  videoId: string;
  // `start` is whole seconds to begin playback at; omitted entirely (not 0)
  // when there's no timecode, so the option object stays minimal.
  playerVars?: { autoplay?: 0 | 1; start?: number };
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void;
    // Fires when the video can't be played embedded (private, deleted, embed
    // disabled, region/age restricted) or the player hits a playback error.
    onError?: (event: YouTubePlayerEvent) => void;
    // Fires on every playback-state transition (unstarted/buffering/playing…).
    onStateChange?: (event: YouTubePlayerEvent) => void;
  };
}

export interface YouTubeIframeApi {
  Player: new (
    element: HTMLElement,
    options: YouTubePlayerOptions,
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeIframeApi> | null = null;

export function loadYouTubeIframeApi(): Promise<YouTubeIframeApi> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => {
      apiPromise = null; // don't cache a dead promise — a later call can retry
      reject(new Error("Failed to load YouTube IFrame API"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function resetYouTubeIframeApiForTests(): void {
  apiPromise = null;
}
