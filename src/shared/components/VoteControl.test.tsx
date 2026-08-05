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

  // The control shows each reaction's own count and no net. A net hid its own
  // composition: 0 from one up and one down rendered identically to 0 from
  // nobody voting, which is how a real 1↑/1↓ comment got misread as a bug in
  // the arithmetic.
  it("shows the like and dislike counts separately, with no net score", () => {
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
    expect(screen.getByRole("button", { name: "Upvote" })).toHaveTextContent(
      "5",
    );
    expect(screen.getByRole("button", { name: "Downvote" })).toHaveTextContent(
      "2",
    );
    // The old net (5 − 2) must not appear anywhere.
    expect(screen.queryByText("3")).not.toBeInTheDocument();
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
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Upvote" })).toHaveTextContent(
        "6",
      ),
    );
    expect(screen.getByRole("button", { name: "Upvote" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
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
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Downvote" }),
      ).toHaveTextContent("5"),
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
    expect(screen.getByRole("button", { name: "Upvote" })).toHaveTextContent(
      "0",
    );
  });

  // Was a hover tooltip. Hover does not exist on a phone, so the reaction just
  // did nothing there with the reason unreachable; clicking now opens the
  // sign-in prompt beside the control.
  it("blocks an anonymous viewer and explains why on click instead of voting", async () => {
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

    // The gate wraps the reaction and swallows the click, so the vote never
    // fires and the prompt appears anchored to it.
    await userEvent.click(up);
    expect(vote).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("Log in to vote");
  });

  it("shows an inline error and keeps the counts when the vote fails", async () => {
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
    expect(screen.getByRole("button", { name: "Upvote" })).toHaveTextContent(
      "3",
    );
    expect(screen.getByRole("button", { name: "Downvote" })).toHaveTextContent(
      "1",
    );
  });

  // `framed` is the page-level treatment: the same two reactions inside a
  // bordered control, so a pack's score holds its own beside Share and Report
  // instead of reading as loose text.
  describe("framed", () => {
    it("keeps the same reactions and behaviour", async () => {
      mockAuth(true);
      const vote = vi
        .fn()
        .mockResolvedValue({ score: 1, likes: 1, dislikes: 0, myVote: 1 });
      render(
        <VoteControl
          vote={vote}
          initialLikes={0}
          initialDislikes={0}
          initialMyVote={null}
          framed
          {...labels}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Upvote" }));
      expect(vote.mock.calls[0]?.[0]).toBe(1);
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Upvote" }),
        ).toHaveTextContent("1"),
      );
    });
  });
});
