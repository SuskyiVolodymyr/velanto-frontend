import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PackCard } from "./PackCard";
import { HOT_PLAYS_THRESHOLD } from "./hot-pack";
import type { PackSummary } from "@/src/shared/types/pack";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const auth = vi.hoisted(() => ({
  current: { user: { id: "u1" } as { id: string } | null },
}));
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => auth.current,
}));

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/src/features/friends-rooms/friends-rooms-client", () => ({
  friendsRoomsClient: { create },
}));

// No `groups`/`rounds` — PackCard takes PackSummary, the list-endpoint shape
// (the backend never sends pack content to a card that doesn't render it).
const BASE_PACK = {
  id: "pack-a",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  language: "en" as PackSummary["language"],
  tags: ["Anime"] as PackSummary["tags"],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved" as const,
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

describe("PackCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.current = { user: { id: "u1" } };
  });

  // Rounds count used to read from `pack.rounds.length`, which no longer
  // exists on the list-endpoint shape the card actually receives — dropped
  // entirely rather than kept, since groups/rounds share one JSON column on
  // the backend and there's no way to select "just enough to count rounds".
  it("shows the format pill and the play count, with no round count", () => {
    const pack: PackSummary = { ...BASE_PACK, format: "save_one" };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("Save One")).toBeInTheDocument();
    expect(screen.queryByText(/rounds?$/)).not.toBeInTheDocument();
    expect(screen.getByText("0 plays")).toBeInTheDocument();
    // Agreement % was dropped from the card in the 2.0.0 redesign.
    expect(screen.queryByText(/agreement/)).not.toBeInTheDocument();
  });

  it("singularizes a one-play pack", () => {
    const pack: PackSummary = { ...BASE_PACK, format: "save_one", totalPlays: 1 };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("1 play")).toBeInTheDocument();
  });

  it("shows the first tag as the cover chip", () => {
    const pack: PackSummary = {
      ...BASE_PACK,
      format: "save_one",
      tags: ["Gaming", "Anime"],
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("Gaming")).toBeInTheDocument();
  });

  describe("HOT badge (derived from real plays)", () => {
    it("shows HOT at or above the play threshold", () => {
      const pack: PackSummary = {
        ...BASE_PACK,
        format: "save_one",
        totalPlays: HOT_PLAYS_THRESHOLD,
      };
      render(<PackCard pack={pack} />);

      expect(screen.getByText("HOT")).toBeInTheDocument();
    });

    it("hides HOT below the threshold", () => {
      const pack: PackSummary = {
        ...BASE_PACK,
        format: "save_one",
        totalPlays: HOT_PLAYS_THRESHOLD - 1,
      };
      render(<PackCard pack={pack} />);

      expect(screen.queryByText("HOT")).not.toBeInTheDocument();
    });
  });

  describe("primary action", () => {
    it("shows a Play link to the pack", () => {
      render(<PackCard pack={{ ...BASE_PACK, format: "save_one" }} />);

      const play = screen.getByRole("link", { name: "Play" });
      expect(play).toHaveAttribute("href", "/packs/pack-a");
    });
  });

  describe("Friends action", () => {
    it("creates a room for the pack and routes into it when clicked", async () => {
      const user = userEvent.setup();
      create.mockResolvedValue({ id: "room-9" });
      render(<PackCard pack={{ ...BASE_PACK, format: "save_one" }} />);

      await user.click(screen.getByRole("button", { name: "Friends" }));

      expect(create).toHaveBeenCalledWith("pack-a");
      await waitFor(() => expect(push).toHaveBeenCalledWith("/rooms/room-9"));
    });

    it("shows an error message when room creation fails, without navigating", async () => {
      const user = userEvent.setup();
      create.mockRejectedValue(new Error("nope"));
      render(<PackCard pack={{ ...BASE_PACK, format: "save_one" }} />);

      await user.click(screen.getByRole("button", { name: "Friends" }));

      expect(
        await screen.findByText("Couldn't create the room. Try again."),
      ).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });

    it("blocks the Friends button with a sign-in tooltip when signed out, without calling create", async () => {
      auth.current = { user: null };
      const user = userEvent.setup();
      render(<PackCard pack={{ ...BASE_PACK, format: "save_one" }} />);

      const friendsButton = screen.getByRole("button", { name: "Friends" });
      expect(friendsButton).toHaveAttribute("aria-disabled", "true");

      await user.click(friendsButton);
      expect(create).not.toHaveBeenCalled();
    });
  });

  it("shows the author @handle when the feed includes author info", () => {
    const pack: PackSummary = {
      ...BASE_PACK,
      format: "save_one",
      author: {
        id: "u1",
        username: "alice",
        avatarKey: null,
        role: "user",
        trusted: false,
      },
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("@alice")).toBeInTheDocument();
  });

  it("omits the author line when the pack has no author summary", () => {
    const pack: PackSummary = { ...BASE_PACK, format: "save_one" };
    render(<PackCard pack={pack} />);

    expect(screen.queryByText(/^@/)).not.toBeInTheDocument();
  });

  describe("published time", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    function renderAgedPack(publishedAt: string, now: string) {
      vi.setSystemTime(new Date(now));
      render(
        <PackCard
          pack={{
            ...BASE_PACK,
            format: "save_one",
            createdAt: publishedAt,
            firstPublishedAt: publishedAt,
          }}
        />,
      );
    }

    it("shows how long ago the pack went public, in a machine-readable <time>", () => {
      renderAgedPack("2026-01-01T00:00:00.000Z", "2026-05-01T00:00:00.000Z");
      expect(screen.getByText("120 days ago").closest("time")).toHaveAttribute(
        "dateTime",
        "2026-01-01T00:00:00.000Z",
      );
    });

    // Intl.RelativeTimeFormat throws a RangeError on NaN, so an unparseable
    // date must not be allowed to take the whole card down.
    it("renders the card without a timestamp when the date is unusable", () => {
      vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
      render(
        <PackCard
          pack={{
            ...BASE_PACK,
            format: "save_one",
            createdAt: "",
            firstPublishedAt: null,
          }}
        />,
      );

      expect(screen.getByText(BASE_PACK.title)).toBeInTheDocument();
      expect(document.querySelector("time")).not.toBeInTheDocument();
    });

    // The card dates the pack by when it went PUBLIC, not when the row was made.
    it("prefers firstPublishedAt over createdAt for the timestamp", () => {
      vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
      render(
        <PackCard
          pack={{
            ...BASE_PACK,
            format: "save_one",
            createdAt: "2026-01-01T00:00:00.000Z",
            firstPublishedAt: "2026-04-01T00:00:00.000Z",
          }}
        />,
      );

      expect(screen.getByText("30 days ago").closest("time")).toHaveAttribute(
        "dateTime",
        "2026-04-01T00:00:00.000Z",
      );
      expect(screen.queryByText("120 days ago")).not.toBeInTheDocument();
    });

    it("falls back to createdAt when firstPublishedAt is null", () => {
      vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
      render(
        <PackCard
          pack={{
            ...BASE_PACK,
            format: "save_one",
            createdAt: "2026-01-01T00:00:00.000Z",
            firstPublishedAt: null,
          }}
        />,
      );

      expect(screen.getByText("120 days ago").closest("time")).toHaveAttribute(
        "dateTime",
        "2026-01-01T00:00:00.000Z",
      );
    });
  });

  it("shows the format pill with no round count for an nxn pack", () => {
    const pack: PackSummary = { ...BASE_PACK, format: "nxn" };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("NxN")).toBeInTheDocument();
    expect(screen.queryByText(/rounds?$/)).not.toBeInTheDocument();
  });

  it("pluralizes play count for more than one play", () => {
    const pack: PackSummary = {
      ...BASE_PACK,
      format: "save_one",
      totalPlays: 124,
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("124 plays")).toBeInTheDocument();
  });

  it("shows a pending badge when showStatus is true and the pack is pending", () => {
    render(
      <PackCard
        pack={{ ...BASE_PACK, format: "save_one", status: "pending" }}
        showStatus
      />,
    );
    expect(screen.getByText("Pending review")).toBeInTheDocument();
  });

  it("shows a rejected badge when showStatus is true and the pack is rejected", () => {
    render(
      <PackCard
        pack={{ ...BASE_PACK, format: "save_one", status: "rejected" }}
        showStatus
      />,
    );
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("shows no status badge when showStatus is true but the pack is approved", () => {
    render(
      <PackCard
        pack={{ ...BASE_PACK, format: "save_one", status: "approved" }}
        showStatus
      />,
    );
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
  });

  it("shows no status badge when showStatus is not passed, even for a pending pack", () => {
    render(
      <PackCard
        pack={{ ...BASE_PACK, format: "save_one", status: "pending" }}
      />,
    );
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
  });

  it("renders the custom cover image when a coverImageKey is set", () => {
    const { container } = render(
      <PackCard
        pack={{
          ...BASE_PACK,
          format: "save_one",
          coverImageKey: "media/cover/x.webp",
        }}
      />,
    );

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("media/cover/x.webp");
  });

  it("renders no cover image (gradient only) when coverImageKey is absent", () => {
    const { container } = render(
      <PackCard pack={{ ...BASE_PACK, format: "save_one" }} />,
    );

    expect(container.querySelector("img")).toBeNull();
  });
});
