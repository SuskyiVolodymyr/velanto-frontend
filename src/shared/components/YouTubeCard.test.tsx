import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { YouTubeCard } from "./YouTubeCard";
import { loadYouTubeIframeApi } from "@/src/shared/lib/youtube-iframe-api";
import type { YouTubeIframeApi, YouTubePlayer } from "@/src/shared/lib/youtube-iframe-api";

vi.mock("@/src/shared/lib/youtube-iframe-api", () => ({
  loadYouTubeIframeApi: vi.fn(),
}));

const mockedLoad = vi.mocked(loadYouTubeIframeApi);

function makeFakePlayer(): YouTubePlayer {
  return {
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    destroy: vi.fn(),
  };
}

function makeFakeApi(fakePlayer: YouTubePlayer): YouTubeIframeApi {
  return {
    // A `function` expression, not an arrow function — vitest's mock machinery
    // requires this to support the real IFrame API's `new YT.Player(...)` contract
    // (invoking a `vi.fn().mockImplementation(<arrow fn>)` via `new` throws).
    Player: vi.fn().mockImplementation(function (_el, options) {
      options.events.onReady({ target: fakePlayer });
      return fakePlayer;
    }) as unknown as YouTubeIframeApi["Player"],
  };
}

describe("YouTubeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the thumbnail before any hover, without loading the API", () => {
    mockedLoad.mockReturnValue(new Promise(() => {}));
    render(<YouTubeCard videoId="abc123" />);

    expect(screen.getByRole("img", { name: "YouTube video thumbnail" })).toHaveAttribute(
      "src",
      "https://img.youtube.com/vi/abc123/mqdefault.jpg",
    );
    expect(mockedLoad).not.toHaveBeenCalled();
  });

  it("loads the API and constructs a player on first hover", async () => {
    const fakePlayer = makeFakePlayer();
    const fakeApi = makeFakeApi(fakePlayer);
    mockedLoad.mockResolvedValue(fakeApi);

    render(<YouTubeCard videoId="abc123" />);
    fireEvent.mouseEnter(screen.getByTestId("youtube-card"));

    await waitFor(() => expect(fakeApi.Player).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fakeApi.Player).mock.calls[0][1]).toEqual(
      expect.objectContaining({ videoId: "abc123", playerVars: { autoplay: 1 } }),
    );
    expect(fakePlayer.playVideo).toHaveBeenCalled();
  });

  it("reuses the existing player on subsequent hovers instead of reloading the API", async () => {
    const fakePlayer = makeFakePlayer();
    const fakeApi = makeFakeApi(fakePlayer);
    mockedLoad.mockResolvedValue(fakeApi);

    render(<YouTubeCard videoId="abc123" />);
    const card = screen.getByTestId("youtube-card");
    fireEvent.mouseEnter(card);
    await waitFor(() => expect(fakeApi.Player).toHaveBeenCalledTimes(1));

    fireEvent.mouseLeave(card);
    expect(fakePlayer.pauseVideo).toHaveBeenCalledTimes(1);

    fireEvent.mouseEnter(card);
    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(fakeApi.Player).toHaveBeenCalledTimes(1);
    expect(fakePlayer.playVideo).toHaveBeenCalledTimes(2);
  });

  it("destroys the player on unmount", async () => {
    const fakePlayer = makeFakePlayer();
    const fakeApi = makeFakeApi(fakePlayer);
    mockedLoad.mockResolvedValue(fakeApi);

    const { unmount } = render(<YouTubeCard videoId="abc123" />);
    fireEvent.mouseEnter(screen.getByTestId("youtube-card"));
    await waitFor(() => expect(fakeApi.Player).toHaveBeenCalledTimes(1));

    unmount();
    expect(fakePlayer.destroy).toHaveBeenCalledTimes(1);
  });

  it("does not crash and stays on the thumbnail if the API fails to load", async () => {
    mockedLoad.mockRejectedValue(new Error("Failed to load YouTube IFrame API"));

    render(<YouTubeCard videoId="abc123" />);
    fireEvent.mouseEnter(screen.getByTestId("youtube-card"));

    await waitFor(() => expect(mockedLoad).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("img", { name: "YouTube video thumbnail" })).toBeInTheDocument();
  });
});
