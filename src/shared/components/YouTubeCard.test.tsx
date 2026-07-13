import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { YouTubeCard } from "./YouTubeCard";
import { loadYouTubeIframeApi } from "@/src/shared/lib/youtube-iframe-api";
import type {
  YouTubeIframeApi,
  YouTubePlayer,
} from "@/src/shared/lib/youtube-iframe-api";

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

    expect(
      screen.getByRole("img", { name: "YouTube video thumbnail" }),
    ).toHaveAttribute("src", "https://img.youtube.com/vi/abc123/mqdefault.jpg");
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
      expect.objectContaining({
        videoId: "abc123",
        playerVars: { autoplay: 1 },
      }),
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
    mockedLoad.mockRejectedValue(
      new Error("Failed to load YouTube IFrame API"),
    );

    render(<YouTubeCard videoId="abc123" />);
    fireEvent.mouseEnter(screen.getByTestId("youtube-card"));

    await waitFor(() => expect(mockedLoad).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("img", { name: "YouTube video thumbnail" }),
    ).toBeInTheDocument();
  });

  it("lets a touch/keyboard user start playback via the play button, without hovering", async () => {
    const fakePlayer = makeFakePlayer();
    const fakeApi = makeFakeApi(fakePlayer);
    mockedLoad.mockResolvedValue(fakeApi);
    const user = userEvent.setup();

    render(<YouTubeCard videoId="abc123" />);
    await user.click(
      screen.getByRole("button", { name: "Play video preview" }),
    );

    await waitFor(() => expect(fakeApi.Player).toHaveBeenCalledTimes(1));
    expect(fakePlayer.playVideo).toHaveBeenCalled();
  });

  it("does not let a click on the play button bubble to an ancestor's own click handler", async () => {
    mockedLoad.mockReturnValue(new Promise(() => {}));
    const ancestorClick = vi.fn();
    const user = userEvent.setup();

    render(
      <div onClick={ancestorClick}>
        <YouTubeCard videoId="abc123" />
      </div>,
    );
    await user.click(
      screen.getByRole("button", { name: "Play video preview" }),
    );

    expect(ancestorClick).not.toHaveBeenCalled();
  });

  it("does not call player controls until the player is ready", async () => {
    // The real IFrame API returns from `new YT.Player()` before playVideo /
    // pauseVideo are callable — they only arrive once `onReady` fires. Driving
    // them in that window crashes with "pauseVideo is not a function". Here the
    // fake defers onReady, so hovering in and back out happens while not ready.
    const player = makeFakePlayer();
    let fireReady = () => {};
    const api: YouTubeIframeApi = {
      Player: vi.fn().mockImplementation(function (
        _el: unknown,
        options: {
          events: { onReady: (e: { target: YouTubePlayer }) => void };
        },
      ) {
        fireReady = () => options.events.onReady({ target: player });
        return player;
      }) as unknown as YouTubeIframeApi["Player"],
    };
    mockedLoad.mockResolvedValue(api);

    render(<YouTubeCard videoId="abc123" />);
    const card = screen.getByTestId("youtube-card");
    fireEvent.mouseEnter(card);
    await waitFor(() => expect(api.Player).toHaveBeenCalledTimes(1));

    // Player constructed but not ready: a hover that ends now must not poke
    // controls that don't exist yet.
    fireEvent.mouseLeave(card);
    expect(player.pauseVideo).not.toHaveBeenCalled();
    expect(player.playVideo).not.toHaveBeenCalled();

    // Once ready while unhovered, the effect syncs state and pauses.
    fireReady();
    await waitFor(() => expect(player.pauseVideo).toHaveBeenCalledTimes(1));
  });

  it("destroys the old player and falls back to the new thumbnail when videoId changes", async () => {
    const fakePlayer = makeFakePlayer();
    const fakeApi = makeFakeApi(fakePlayer);
    mockedLoad.mockResolvedValue(fakeApi);

    const { rerender } = render(<YouTubeCard videoId="abc123" />);
    fireEvent.mouseEnter(screen.getByTestId("youtube-card"));
    await waitFor(() => expect(fakeApi.Player).toHaveBeenCalledTimes(1));

    rerender(<YouTubeCard videoId="xyz789" />);

    expect(fakePlayer.destroy).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("img", { name: "YouTube video thumbnail" }),
    ).toHaveAttribute("src", "https://img.youtube.com/vi/xyz789/mqdefault.jpg");
  });
});
