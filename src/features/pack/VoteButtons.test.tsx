import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VoteButtons } from "./VoteButtons";
import { packsClient } from "@/src/shared/lib/packs-client";
import { useAuth } from "@/src/shared/lib/auth-context";

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
