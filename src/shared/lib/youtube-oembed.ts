export interface OEmbedResult {
  title: string;
}

export async function fetchYouTubeOEmbed(url: string): Promise<OEmbedResult | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return null;
    const data = await res.json();
    return { title: typeof data.title === "string" ? data.title : "" };
  } catch {
    return null;
  }
}
