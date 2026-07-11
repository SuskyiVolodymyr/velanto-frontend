import { screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeedbackVote } from "./FeedbackVote";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/feedback-client");
vi.mock("@/src/shared/lib/auth-context");

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/feedback/f1",
}));

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
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

describe("FeedbackVote", () => {
  beforeEach(() => vi.resetAllMocks());

  it("renders score/like/dislike counts from the initial props", () => {
    mockAuth(true);
    render(
      <FeedbackVote
        feedbackId="f1"
        initialScore={2}
        initialLikes={3}
        initialDislikes={1}
        initialMyVote={null}
      />,
    );
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("clicking Like calls vote with value 1 and updates counts from the response", async () => {
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
        initialScore={0}
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^like/i }));
    expect(mockedFeedbackClient.vote).toHaveBeenCalledWith("f1", 1);
    const likeButton = screen.getByRole("button", { name: /^like/i });
    await waitFor(() =>
      expect(within(likeButton).getByText("1")).toBeInTheDocument(),
    );
  });

  it("blocks an anonymous viewer with a reason tooltip instead of voting or redirecting", async () => {
    mockAuth(false);
    render(
      <FeedbackVote
        feedbackId="f1"
        initialScore={0}
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    const likeButton = screen.getByRole("button", { name: /^like/i });
    expect(likeButton).toHaveAttribute("aria-disabled", "true");

    await userEvent.hover(likeButton);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Log in to vote");

    await userEvent.click(likeButton);
    expect(mockedFeedbackClient.vote).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows an inline error when the vote call fails", async () => {
    mockAuth(true);
    mockedFeedbackClient.vote.mockRejectedValue(new Error("network"));
    render(
      <FeedbackVote
        feedbackId="f1"
        initialScore={0}
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^like/i }));
    await waitFor(() =>
      expect(screen.getByText(/couldn't/i)).toBeInTheDocument(),
    );
  });
});
