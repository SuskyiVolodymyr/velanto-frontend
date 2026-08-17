import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchYouTubeOEmbed } from "./youtube-oembed";

describe("fetchYouTubeOEmbed", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the video title on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ title: "Guren no Yumiya" }),
      }),
    );

    const result = await fetchYouTubeOEmbed("https://youtu.be/KsF_hdjWJjo");

    expect(result).toEqual({ title: "Guren no Yumiya" });
  });

  it("returns null when the video doesn't exist (oEmbed 404s)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const result = await fetchYouTubeOEmbed("https://youtu.be/doesnotexist");

    expect(result).toBeNull();
  });

  it("returns null when the network request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );

    const result = await fetchYouTubeOEmbed("https://youtu.be/KsF_hdjWJjo");

    expect(result).toBeNull();
  });

  it("requests the oEmbed endpoint with the URL-encoded video URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ title: "x" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchYouTubeOEmbed("https://youtu.be/KsF_hdjWJjo");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.youtube.com/oembed?url=https%3A%2F%2Fyoutu.be%2FKsF_hdjWJjo&format=json",
    );
  });

  it("falls back to an empty title when the response body has no title", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    const result = await fetchYouTubeOEmbed("https://youtu.be/KsF_hdjWJjo");

    expect(result).toEqual({ title: "" });
  });
});
