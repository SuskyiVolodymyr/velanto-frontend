export interface YouTubePlayerEvent {
  target: YouTubePlayer;
}

export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

export interface YouTubePlayerOptions {
  videoId: string;
  playerVars?: { autoplay?: 0 | 1 };
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void;
  };
}

export interface YouTubeIframeApi {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
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
  apiPromise = new Promise((resolve) => {
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
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function resetYouTubeIframeApiForTests(): void {
  apiPromise = null;
}
