import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { YouTubeCard } from "./YouTubeCard";
import { loadYouTubeIframeApi } from "@/src/shared/lib/youtube-iframe-api";
import type {
  YouTubeIframeApi,
  YouTubePlayer,
} from "@/src/shared/lib/youtube-iframe-api";

// Only loadYouTubeIframeApi is mocked; the YT_STATE_* constants stay real so the
// component's state-change comparison uses the true values.
vi.mock("@/src/shared/lib/youtube-iframe-api", async (importActual) => ({
  ...(await importActual<
    typeof import("@/src/shared/lib/youtube-iframe-api")
  >()),
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

  it("shows the thumbnail and builds NO player on mount (lazy)", () => {
    mockedLoad.mockReturnValue(new Promise(() => {}));
    render(<YouTubeCard videoId="abc123" />);

    expect(
      screen.getByRole("img", { name: "YouTube video thumbnail" }),
    ).toHaveAttribute("src", "https://img.youtube.com/vi/abc123/mqdefault.jpg");
    // The whole point of the facade: nothing is loaded from YouTube on mount, so
    // a round of N videos builds N thumbnails, not N embeds (no throttle).
    expect(mockedLoad).not.toHaveBeenCalled();
  });

  it("constructs the player only once the card is hovered, with autoplay off", async () => {
    const fakePlayer = makeFakePlayer();
    const fakeApi = makeFakeApi(fakePlayer);
    mockedLoad.mockResolvedValue(fakeApi);

    render(<YouTubeCard videoId="abc123" />);
    // Not built until engaged.
    expect(mockedLoad).not.toHaveBeenCalled();

    fireEvent.mouseEnter(screen.getByTestId("youtube-card"));

    await waitFor(() => expect(fakeApi.Player).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fakeApi.Player).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        videoId: "abc123",
        playerVars: { autoplay: 0 },
      }),
    );
  });

  // A pack author who pasted a link with a timecode meant the clip, not the
  // whole video — most of the point of allowing a timecode at all.
  it("starts at the given offset when the author's link carried a timecode", async () => {
    const fakePlayer = makeFakePlayer();
    const fakeApi = makeFakeApi(fakePlayer);
    mockedLoad.mockResolvedValue(fakeApi);

    render(<YouTubeCard videoId="abc123" startSeconds={90} />);
    fireEvent.mouseEnter(screen.getByTestId("youtube-card"));

    await waitFor(() => expect(fakeApi.Player).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fakeApi.Player).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        playerVars: { autoplay: 0, start: 90 },
      }),
    );
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

  // The fallback is where a viewer lands when the embed is blocked — dropping
  // the timecode there sends them to 0:00 of a video the author meant to clip.
  it("keeps the timecode on the Open-on-YouTube fallback link", async () => {
    const player = makeFakePlayer();
    const api: YouTubeIframeApi = {
      Player: vi.fn().mockImplementation(function (
        _el: unknown,
        options: {
          events: { onError: (e: { target: YouTubePlayer }) => void };
        },
      ) {
        options.events.onError({ target: player });
        return player;
      }) as unknown as YouTubeIframeApi["Player"],
    };
    mockedLoad.mockResolvedValue(api);

    render(<YouTubeCard videoId="abc123" startSeconds={90} />);
    fireEvent.mouseEnter(screen.getByTestId("youtube-card"));

    const link = await screen.findByRole("link", { name: /open on youtube/i });
    expect(link).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=abc123&t=90",
    );
  });

  it("falls back to an Open-on-YouTube link when the video can't be embedded", async () => {
    const player = makeFakePlayer();
    const api: YouTubeIframeApi = {
      Player: vi.fn().mockImplementation(function (
        _el: unknown,
        options: {
          events: { onError: (e: { target: YouTubePlayer }) => void };
        },
      ) {
        options.events.onError({ target: player });
        return player;
      }) as unknown as YouTubeIframeApi["Player"],
    };
    mockedLoad.mockResolvedValue(api);

    render(<YouTubeCard videoId="abc123" />);
    fireEvent.mouseEnter(screen.getByTestId("youtube-card"));

    const link = await screen.findByRole("link", { name: /open on youtube/i });
    expect(link).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=abc123",
    );
    // The play-preview button is gone once the video has failed.
    expect(
      screen.queryByRole("button", { name: "Play video preview" }),
    ).toBeNull();
  });

  // #349: the fallback says "this video can't play here". Painting that over a
  // player that IS playing is simply false, whatever error code arrived — and
  // YouTube fires onError mid-playback often enough that almost every video in
  // a pack could end up behind it.
  it("keeps a playing video when an error arrives after playback started", async () => {
    vi.useFakeTimers();
    try {
      const player = makeFakePlayer();
      let fire: {
        state: (s: number) => void;
        error: () => void;
      } = { state: () => {}, error: () => {} };
      const api: YouTubeIframeApi = {
        Player: vi.fn().mockImplementation(function (
          _el: unknown,
          options: {
            events: {
              onReady: (e: { target: YouTubePlayer }) => void;
              onError: (e: { target: YouTubePlayer }) => void;
              onStateChange?: (e: {
                target: YouTubePlayer;
                data: number;
              }) => void;
            };
          },
        ) {
          options.events.onReady({ target: player });
          fire = {
            state: (s) =>
              options.events.onStateChange?.({ target: player, data: s }),
            error: () => options.events.onError({ target: player }),
          };
          return player;
        }) as unknown as YouTubeIframeApi["Player"],
      };
      mockedLoad.mockResolvedValue(api);

      render(<YouTubeCard videoId="abc123" />);
      fireEvent.mouseEnter(screen.getByTestId("youtube-card"));
      await vi.advanceTimersByTimeAsync(0);

      act(() => fire.state(1)); // PLAYING
      act(() => fire.error());
      // Still playing right after the error — YouTube reports more playback.
      act(() => fire.state(1));
      await vi.advanceTimersByTimeAsync(5000);

      expect(
        screen.queryByRole("link", { name: /open on youtube/i }),
      ).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  // The other half of the same rule: an error that really does stop playback
  // still reaches the fallback, just after a grace window rather than instantly.
  it("falls back when a mid-playback error is followed by no more playback", async () => {
    vi.useFakeTimers();
    try {
      const player = makeFakePlayer();
      let fire: {
        state: (s: number) => void;
        error: () => void;
      } = { state: () => {}, error: () => {} };
      const api: YouTubeIframeApi = {
        Player: vi.fn().mockImplementation(function (
          _el: unknown,
          options: {
            events: {
              onReady: (e: { target: YouTubePlayer }) => void;
              onError: (e: { target: YouTubePlayer }) => void;
              onStateChange?: (e: {
                target: YouTubePlayer;
                data: number;
              }) => void;
            };
          },
        ) {
          options.events.onReady({ target: player });
          fire = {
            state: (s) =>
              options.events.onStateChange?.({ target: player, data: s }),
            error: () => options.events.onError({ target: player }),
          };
          return player;
        }) as unknown as YouTubeIframeApi["Player"],
      };
      mockedLoad.mockResolvedValue(api);

      render(<YouTubeCard videoId="abc123" />);
      fireEvent.mouseEnter(screen.getByTestId("youtube-card"));
      await vi.advanceTimersByTimeAsync(0);

      act(() => fire.state(1)); // PLAYING
      act(() => fire.error()); // …and it never plays again
      await vi.advanceTimersByTimeAsync(5000);

      expect(
        screen.queryByRole("link", { name: /open on youtube/i }),
      ).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to Open-on-YouTube when commanded playback never starts (server throttle)", async () => {
    vi.useFakeTimers();
    try {
      const player = makeFakePlayer();
      const api = makeFakeApi(player); // onReady fires immediately; no onStateChange
      mockedLoad.mockResolvedValue(api);

      render(<YouTubeCard videoId="abc123" />);
      // Hover activates the card; flush the resolved API promise so the player
      // is constructed, ready, and commanded to play.
      fireEvent.mouseEnter(screen.getByTestId("youtube-card"));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(api.Player).toHaveBeenCalledTimes(1);
      expect(player.playVideo).toHaveBeenCalled();

      // Playback never reports buffering/playing (throttled). Past the watchdog
      // window, the card gives up and shows our fallback instead of YouTube's
      // raw error box.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      const link = screen.getByRole("link", { name: /open on youtube/i });
      expect(link).toHaveAttribute(
        "href",
        "https://www.youtube.com/watch?v=abc123",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not fall back when playback reaches buffering/playing after hovering", async () => {
    vi.useFakeTimers();
    try {
      const player = makeFakePlayer();
      let fireStateChange: (state: number) => void = () => {};
      const api: YouTubeIframeApi = {
        Player: vi.fn().mockImplementation(function (
          _el: unknown,
          options: {
            events: {
              onReady: (e: { target: YouTubePlayer }) => void;
              onStateChange?: (e: {
                target: YouTubePlayer;
                data: number;
              }) => void;
            };
          },
        ) {
          options.events.onReady({ target: player });
          fireStateChange = (state: number) =>
            options.events.onStateChange?.({ target: player, data: state });
          return player;
        }) as unknown as YouTubeIframeApi["Player"],
      };
      mockedLoad.mockResolvedValue(api);

      render(<YouTubeCard videoId="abc123" />);
      fireEvent.mouseEnter(screen.getByTestId("youtube-card"));
      await vi.advanceTimersByTimeAsync(0);

      // Playback starts buffering (YT_STATE_BUFFERING = 3) before the watchdog.
      fireStateChange(3);
      await vi.advanceTimersByTimeAsync(5000);

      expect(
        screen.queryByRole("link", { name: /open on youtube/i }),
      ).toBeNull();
    } finally {
      vi.useRealTimers();
    }
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
