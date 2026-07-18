import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VoteControl } from "./VoteControl";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/auth-context");
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
    revalidate: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

const labels = {
  upvoteLabel: "Upvote",
  downvoteLabel: "Downvote",
  blockedReason: "Log in to vote",
  errorLabel: "Couldn't vote",
};

describe("VoteControl", () => {
  beforeEach(() => vi.resetAllMocks());

  it("shows the net score plus the likes and dislikes counts", () => {
    mockAuth(true);
    render(
      <VoteControl
        vote={vi.fn()}
        initialLikes={5}
        initialDislikes={2}
        initialMyVote={null}
        {...labels}
      />,
    );
    // net score = 5 − 2 = 3; likes 5 under the up arrow; dislikes 2 under down.
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("casts an upvote and reflects the returned tally", async () => {
    mockAuth(true);
    const vote = vi
      .fn()
      .mockResolvedValue({ score: 4, likes: 6, dislikes: 2, myVote: 1 });
    render(
      <VoteControl
        vote={vote}
        initialLikes={5}
        initialDislikes={2}
        initialMyVote={null}
        {...labels}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Upvote" }));
    expect(vote.mock.calls[0]?.[0]).toBe(1);
    await waitFor(() => expect(screen.getByText("4")).toBeInTheDocument());
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("casts a downvote", async () => {
    mockAuth(true);
    const vote = vi
      .fn()
      .mockResolvedValue({ score: -2, likes: 3, dislikes: 5, myVote: -1 });
    render(
      <VoteControl
        vote={vote}
        initialLikes={4}
        initialDislikes={4}
        initialMyVote={null}
        {...labels}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Downvote" }));
    expect(vote.mock.calls[0]?.[0]).toBe(-1);
    await waitFor(() => expect(screen.getByText("-2")).toBeInTheDocument());
  });

  it("reflects a toggle-off tally (myVote becomes null) rather than falling back to the initial vote", async () => {
    mockAuth(true);
    // Re-clicking an active upvote toggles it off: the server returns myVote:
    // null, which must be shown wholesale — not `?? initialMyVote`.
    const vote = vi
      .fn()
      .mockResolvedValue({ score: 0, likes: 0, dislikes: 0, myVote: null });
    render(
      <VoteControl
        vote={vote}
        initialLikes={1}
        initialDislikes={0}
        initialMyVote={1}
        {...labels}
      />,
    );
    const up = screen.getByRole("button", { name: "Upvote" });
    expect(up).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(up);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Upvote" })).toHaveAttribute(
        "aria-pressed",
        "false",
      ),
    );
    // score, likes and dislikes are all 0 after toggling off.
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
  });

  it("blocks an anonymous viewer with a reason tooltip instead of voting", async () => {
    mockAuth(false);
    const vote = vi.fn();
    render(
      <VoteControl
        vote={vote}
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
        {...labels}
      />,
    );
    const up = screen.getByRole("button", { name: "Upvote" });
    expect(up).toHaveAttribute("aria-disabled", "true");

    await userEvent.hover(up);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Log in to vote");

    await userEvent.click(up);
    expect(vote).not.toHaveBeenCalled();
  });

  it("shows an inline error and keeps the score when the vote fails", async () => {
    mockAuth(true);
    const vote = vi.fn().mockRejectedValue(new Error("network"));
    render(
      <VoteControl
        vote={vote}
        initialLikes={3}
        initialDislikes={1}
        initialMyVote={null}
        {...labels}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Upvote" }));
    await waitFor(() =>
      expect(screen.getByText("Couldn't vote")).toBeInTheDocument(),
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
