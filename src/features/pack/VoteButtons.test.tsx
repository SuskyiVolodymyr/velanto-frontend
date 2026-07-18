import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VoteButtons } from "./VoteButtons";
import { packsClient } from "@/src/shared/lib/packs-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { Pack } from "@/src/shared/types/pack";

// VoteButtons is a thin wrapper over the shared VoteControl (see
// VoteControl.test.tsx for the full tally/score/blocked behaviour). These tests
// only cover the wiring: the packs client, the pack id, and the labels.
vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/auth-context");

const mockedPacksClient = vi.mocked(packsClient);
const mockedUseAuth = vi.mocked(useAuth);

function mockAuth(authenticated: boolean) {
  mockedUseAuth.mockReturnValue({
    user: authenticated
      ? {
          id: "u1",
          email: "a@x.com",
          username: "a",
          role: "user",
          createdAt: "",
        }
      : null,
    status: authenticated ? "authenticated" : "unauthenticated",
    login: vi.fn(),
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setAvatarKey: vi.fn(),
    patchUser: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

describe("VoteButtons", () => {
  beforeEach(() => vi.resetAllMocks());

  it("renders the net score (likes − dislikes) from the initial props", () => {
    mockAuth(true);
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={3}
        initialDislikes={1}
        initialMyVote={null}
      />,
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("votes on the pack via the packs client when an arrow is clicked", async () => {
    mockAuth(true);
    mockedPacksClient.vote.mockResolvedValue({
      score: 1,
      likes: 1,
      dislikes: 0,
      myVote: 1,
    });
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Upvote" }));
    expect(mockedPacksClient.vote).toHaveBeenCalledWith("pack-1", 1);
    await userEvent.click(screen.getByRole("button", { name: "Downvote" }));
    expect(mockedPacksClient.vote).toHaveBeenCalledWith("pack-1", -1);
  });

  // The server-rendered pack is fetched anonymously (getPackServer forwards no
  // auth), so `initialMyVote` is always null on first paint even for a signed-in
  // viewer who already voted — the like rendered grey after every refresh. The
  // wrapper re-fetches as the authenticated viewer to recover the real vote.
  it("recovers the signed-in viewer's vote that the anonymous SSR fetch missed", async () => {
    mockAuth(true);
    mockedPacksClient.getById.mockResolvedValue({
      id: "pack-1",
      likes: 5,
      dislikes: 1,
      myVote: 1,
    } as Pack);
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={5}
        initialDislikes={1}
        initialMyVote={null}
      />,
    );

    const up = screen.getByRole("button", { name: "Upvote" });
    // First paint mirrors the SSR data: not pressed.
    expect(up).toHaveAttribute("aria-pressed", "false");
    // Once the authed re-fetch resolves, the viewer's real vote shows.
    await waitFor(() => expect(up).toHaveAttribute("aria-pressed", "true"));
    expect(mockedPacksClient.getById).toHaveBeenCalledWith("pack-1");
  });

  it("does not re-fetch for an anonymous viewer (the anon SSR fetch was already definitive)", async () => {
    mockAuth(false);
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    // Give any enabled query a tick to fire; it must not.
    await Promise.resolve();
    expect(mockedPacksClient.getById).not.toHaveBeenCalled();
  });

  it("blocks an anonymous viewer with a reason tooltip instead of voting", async () => {
    mockAuth(false);
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    const up = screen.getByRole("button", { name: "Upvote" });
    expect(up).toHaveAttribute("aria-disabled", "true");

    await userEvent.hover(up);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Log in to vote");

    await userEvent.click(up);
    expect(mockedPacksClient.vote).not.toHaveBeenCalled();
  });
});
