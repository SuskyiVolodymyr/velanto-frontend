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

  // `layout="inline"` is the comment-thread shape: one row, no box, and one
  // number. Everything below would also pass under the stacked pill except the
  // "only the net score" test, which is the one that pins the shape.
  describe('layout="inline"', () => {
    it("shows only the net score — the per-direction like/dislike counts are dropped", () => {
      mockAuth(true);
      render(
        <VoteControl
          vote={vi.fn()}
          initialLikes={5}
          initialDislikes={2}
          initialMyVote={null}
          layout="inline"
          {...labels}
        />,
      );
      // Stacked renders 3 (net), 5 (likes) and 2 (dislikes). Inline renders the
      // net score alone, so the raw counts must be absent.
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.queryByText("5")).not.toBeInTheDocument();
      expect(screen.queryByText("2")).not.toBeInTheDocument();
    });

    it("still wires both arrows to the vote and reflects the returned tally", async () => {
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
          layout="inline"
          {...labels}
        />,
      );
      expect(
        screen.getByRole("button", { name: "Downvote" }),
      ).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Upvote" }));
      expect(vote.mock.calls[0]?.[0]).toBe(1);
      await waitFor(() => expect(screen.getByText("4")).toBeInTheDocument());
      // The pressed state survives the layout swap.
      expect(screen.getByRole("button", { name: "Upvote" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("marks the viewer's existing downvote as pressed", () => {
      mockAuth(true);
      render(
        <VoteControl
          vote={vi.fn()}
          initialLikes={1}
          initialDislikes={3}
          initialMyVote={-1}
          layout="inline"
          {...labels}
        />,
      );
      expect(screen.getByRole("button", { name: "Downvote" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: "Upvote" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
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
          layout="inline"
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

    it("shows the failure message and keeps the score", async () => {
      mockAuth(true);
      const vote = vi.fn().mockRejectedValue(new Error("network"));
      render(
        <VoteControl
          vote={vote}
          initialLikes={3}
          initialDislikes={1}
          initialMyVote={null}
          layout="inline"
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

  // The score describes the COMMENT, so it must look the same to every viewer.
  // It used to be tinted by `myVote`, which meant a 0 you had downvoted looked
  // identical to a genuinely negative score, and a -4 read as neutral until you
  // voted on it — which is exactly how a real 1↑/1↓ comment got misread as a
  // bug in the arithmetic.
  describe("inline score colour", () => {
    function inlineScore(
      likes: number,
      dislikes: number,
      myVote: 1 | -1 | null,
    ) {
      const { unmount } = render(
        <VoteControl
          vote={vi.fn()}
          layout="inline"
          initialLikes={likes}
          initialDislikes={dislikes}
          initialMyVote={myVote}
          {...labels}
        />,
      );
      const className = screen.getByText(String(likes - dislikes)).className;
      unmount();
      return className;
    }

    beforeEach(() => mockAuth(true));

    // Asserted as an equality between two renders rather than against a literal
    // token, so it pins the RULE ("stance doesn't affect it") and survives a
    // change of palette.
    it("ignores how you voted — same tally, same colour", () => {
      const neutral = inlineScore(3, 1, null);
      expect(inlineScore(3, 1, 1)).toBe(neutral);
      expect(inlineScore(3, 1, -1)).toBe(neutral);
    });

    it("distinguishes a positive, negative and zero score", () => {
      const positive = inlineScore(3, 1, null);
      const negative = inlineScore(1, 3, null);
      const zero = inlineScore(1, 1, null);
      expect(positive).not.toBe(negative);
      expect(zero).not.toBe(positive);
      expect(zero).not.toBe(negative);
    });

    // A net of 0 hides whether it came from silence or from 1↑/1↓, and inline
    // has no room for the per-direction counts the stacked pill shows.
    it("keeps the breakdown reachable behind the net", () => {
      render(
        <VoteControl
          vote={vi.fn()}
          layout="inline"
          initialLikes={1}
          initialDislikes={1}
          initialMyVote={-1}
          {...labels}
        />,
      );
      expect(screen.getByText("0")).toHaveAttribute("title", "1 up · 1 down");
    });
  });
});
