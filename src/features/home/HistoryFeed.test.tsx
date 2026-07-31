import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { HistoryFeed } from "./HistoryFeed";
import { usersClient } from "@/src/shared/lib/users-client";
import { listPlayResumes } from "@/src/features/play/play-resume-storage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/src/features/friends-rooms/friends-rooms-client", () => ({
  friendsRoomsClient: { create: vi.fn() },
}));

vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: { recentlyPlayed: vi.fn() },
}));
vi.mock("@/src/features/play/play-resume-storage", () => ({
  listPlayResumes: vi.fn(() => []),
}));

let authState: { status: string; user: { id: string } | null } = {
  status: "authenticated",
  user: { id: "u1" },
};
vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: () => authState }));

function playedPack(id: string, lastPlayedAt: string, format = "save_one") {
  return {
    id,
    title: `Pack ${id}`,
    description: "",
    coverTone: "#123456",
    coverImageKey: null,
    language: "en",
    tags: [],
    format,
    status: "approved",
    authorId: "a1",
    author: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    firstPublishedAt: "2026-01-01T00:00:00.000Z",
    totalPlays: 3,
    upvotes: 0,
    downvotes: 0,
    myVote: null,
    lastPlayedAt,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authState = { status: "authenticated", user: { id: "u1" } };
  vi.mocked(listPlayResumes).mockReturnValue([]);
  vi.mocked(usersClient.recentlyPlayed).mockResolvedValue({
    items: [playedPack("p1", "2026-07-30T10:00:00.000Z")],
    total: 1,
    page: 1,
    limit: 25,
  } as never);
});

describe("HistoryFeed", () => {
  it("asks for the newest plays first, for the signed-in user", async () => {
    render(<HistoryFeed />);

    await waitFor(() =>
      expect(usersClient.recentlyPlayed).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ page: 1, sort: "recent" }),
      ),
    );
    expect(await screen.findByText("Pack p1")).toBeInTheDocument();
  });

  // Both filters have to reach the API. Filtering the fetched page instead
  // would leave the pager dividing a total it then hid rows from.
  it("sends the chosen format to the API rather than filtering the page", async () => {
    const user = userEvent.setup();
    render(<HistoryFeed />);
    await screen.findByText("Pack p1");

    await user.click(screen.getByRole("button", { name: "1v1" }));

    await waitFor(() =>
      expect(usersClient.recentlyPlayed).toHaveBeenLastCalledWith(
        "u1",
        expect.objectContaining({ format: "1v1", page: 1 }),
      ),
    );
  });

  it("sends the oldest-first ordering to the API", async () => {
    const user = userEvent.setup();
    render(<HistoryFeed />);
    await screen.findByText("Pack p1");

    await user.click(
      screen.getByRole("button", { name: "Played longest ago" }),
    );

    await waitFor(() =>
      expect(usersClient.recentlyPlayed).toHaveBeenLastCalledWith(
        "u1",
        expect.objectContaining({ sort: "oldest", page: 1 }),
      ),
    );
  });

  it("dates each card by the play, not by publication", async () => {
    render(<HistoryFeed />);

    // Scoped to the card — "Played longest ago" is also the sort chip's label.
    const card = await screen.findByRole("article");
    const stamp = within(card).getByText(/Played/);
    // The pack was published 2026-01-01 but played 2026-07-30 — the card must
    // carry the play's timestamp, or "3 days ago" means the wrong thing.
    expect(stamp.closest("time")).toHaveAttribute(
      "datetime",
      "2026-07-30T10:00:00.000Z",
    );
  });

  it("shows unfinished plays above the grid, with a Continue action", async () => {
    vi.mocked(listPlayResumes).mockReturnValue([
      {
        packId: "p9",
        seed: 1,
        packVersion: "v1",
        roundIndex: 2,
        choices: null,
        pack: { title: "Half-done pack", coverTone: "#222", totalRounds: 5 },
        updatedAt: Date.parse("2026-07-29T10:00:00.000Z"),
      },
    ]);
    render(<HistoryFeed />);

    expect(await screen.findByText("Half-done pack")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continue/ })).toHaveAttribute(
      "href",
      "/packs/p9/play",
    );
    expect(screen.getByText("Round 3 of 5")).toBeInTheDocument();
  });

  it("prompts a signed-out visitor instead of fetching", () => {
    authState = { status: "unauthenticated", user: null };
    render(<HistoryFeed />);

    expect(
      screen.getByText("Log in to see your play history."),
    ).toBeInTheDocument();
    expect(usersClient.recentlyPlayed).not.toHaveBeenCalled();
  });
});
