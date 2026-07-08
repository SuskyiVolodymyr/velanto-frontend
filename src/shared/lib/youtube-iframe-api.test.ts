import { describe, expect, it, vi, beforeEach } from "vitest";
import { loadYouTubeIframeApi, resetYouTubeIframeApiForTests } from "./youtube-iframe-api";

describe("loadYouTubeIframeApi", () => {
  beforeEach(() => {
    resetYouTubeIframeApiForTests();
    delete window.YT;
    delete window.onYouTubeIframeAPIReady;
    document.head.innerHTML = "";
  });

  it("injects the iframe_api script exactly once across repeated calls", () => {
    loadYouTubeIframeApi();
    loadYouTubeIframeApi();
    loadYouTubeIframeApi();

    const scripts = document.head.querySelectorAll(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    expect(scripts).toHaveLength(1);
  });

  it("resolves with window.YT once onYouTubeIframeAPIReady fires", async () => {
    const promise = loadYouTubeIframeApi();
    const fakeYT = { Player: vi.fn() } as unknown as Window["YT"];
    window.YT = fakeYT;
    window.onYouTubeIframeAPIReady!();

    await expect(promise).resolves.toBe(fakeYT);
  });

  it("resolves immediately if window.YT.Player already exists", async () => {
    const fakeYT = { Player: vi.fn() } as unknown as Window["YT"];
    window.YT = fakeYT;

    await expect(loadYouTubeIframeApi()).resolves.toBe(fakeYT);
  });

  it("preserves and calls a pre-existing onYouTubeIframeAPIReady callback", () => {
    const previous = vi.fn();
    window.onYouTubeIframeAPIReady = previous;

    loadYouTubeIframeApi();
    window.YT = { Player: vi.fn() } as unknown as Window["YT"];
    window.onYouTubeIframeAPIReady!();

    expect(previous).toHaveBeenCalledTimes(1);
  });
});
