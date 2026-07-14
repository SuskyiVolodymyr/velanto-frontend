import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeedbackVote } from "./FeedbackVote";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { useAuth } from "@/src/shared/lib/auth-context";

// FeedbackVote is a thin wrapper over the shared VoteControl (see
// VoteControl.test.tsx for the full tally/score/blocked behaviour). These tests
// only cover the wiring: the feedback client, the feedback id, and the labels.
vi.mock("@/src/shared/lib/feedback-client");
vi.mock("@/src/shared/lib/auth-context");

const mockedFeedbackClient = vi.mocked(feedbackClient);
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

describe("FeedbackVote", () => {
  beforeEach(() => vi.resetAllMocks());

  it("renders the net score and the like/dislike counts from the initial props", () => {
    mockAuth(true);
    render(
      <FeedbackVote
        feedbackId="f1"
        initialLikes={3}
        initialDislikes={1}
        initialMyVote={null}
      />,
    );
    expect(screen.getByText("2")).toBeInTheDocument(); // net score
    expect(screen.getByText("3")).toBeInTheDocument(); // likes
    expect(screen.getByText("1")).toBeInTheDocument(); // dislikes
  });

  it("votes on the feedback post via the feedback client when an arrow is clicked", async () => {
    mockAuth(true);
    mockedFeedbackClient.vote.mockResolvedValue({
      score: 1,
      likes: 1,
      dislikes: 0,
      myVote: 1,
    });
    render(
      <FeedbackVote
        feedbackId="f1"
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^like$/i }));
    expect(mockedFeedbackClient.vote).toHaveBeenCalledWith("f1", 1);
    await userEvent.click(screen.getByRole("button", { name: /^dislike$/i }));
    expect(mockedFeedbackClient.vote).toHaveBeenCalledWith("f1", -1);
  });

  it("blocks an anonymous viewer with a reason tooltip instead of voting", async () => {
    mockAuth(false);
    render(
      <FeedbackVote
        feedbackId="f1"
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    const like = screen.getByRole("button", { name: /^like$/i });
    expect(like).toHaveAttribute("aria-disabled", "true");

    await userEvent.hover(like);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Log in to vote");

    await userEvent.click(like);
    expect(mockedFeedbackClient.vote).not.toHaveBeenCalled();
  });
});
