const VIDEO_ID_RE = /(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/;

export function extractYouTubeId(url: string): string | null {
  const match = url.match(VIDEO_ID_RE);
  return match ? match[1] : null;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
