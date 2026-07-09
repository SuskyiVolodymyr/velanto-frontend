import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackComments } from "./FeedbackComments";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { FeedbackComment } from "@/src/shared/types/feedback";

vi.mock("@/src/shared/lib/feedback-client");
vi.mock("@/src/shared/lib/auth-context");

const mockedFeedbackClient = vi.mocked(feedbackClient);
const mockedUseAuth = vi.mocked(useAuth);

function mockAuth(authenticated: boolean) {
  mockedUseAuth.mockReturnValue({
    user: authenticated ? { id: "u1", email: "a@x.com", username: "alice", role: "user", createdAt: "" } : null,
    status: authenticated ? "authenticated" : "unauthenticated",
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

const COMMENT_A: FeedbackComment = {
  id: "c1",
  feedbackId: "f1",
  authorId: "u2",
  authorUsername: "bob",
  body: "Loved this.",
  createdAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => vi.resetAllMocks());

describe("FeedbackComments", () => {
  it("fetches page 1 with limit 10 and renders existing comments", async () => {
    mockAuth(false);
    mockedFeedbackClient.listComments.mockResolvedValue({ items: [COMMENT_A], total: 1, page: 1, limit: 10 });

    render(<FeedbackComments feedbackId="f1" />);

    expect(await screen.findByText("bob")).toBeInTheDocument();
    expect(screen.getByText("Loved this.")).toBeInTheDocument();
    expect(mockedFeedbackClient.listComments).toHaveBeenCalledWith("f1", { page: 1, limit: 10 });
  });

  it("shows a log-in prompt instead of a compose form when unauthenticated", async () => {
    mockAuth(false);
    mockedFeedbackClient.listComments.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });

    render(<FeedbackComments feedbackId="f1" />);

    expect(await screen.findByText(/log in/i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("posts a comment and prepends it, clearing the draft", async () => {
    mockAuth(true);
    mockedFeedbackClient.listComments.mockResolvedValue({ items: [COMMENT_A], total: 1, page: 1, limit: 10 });
    const created: FeedbackComment = {
      id: "c2",
      feedbackId: "f1",
      authorId: "u1",
      authorUsername: "alice",
      body: "My take.",
      createdAt: "2026-01-02T00:00:00.000Z",
    };
    mockedFeedbackClient.addComment.mockResolvedValue(created);

    render(<FeedbackComments feedbackId="f1" />);

    const textbox = await screen.findByRole("textbox");
    await userEvent.type(textbox, "My take.");
    await userEvent.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() =>
      expect(mockedFeedbackClient.addComment).toHaveBeenCalledWith("f1", { body: "My take." }),
    );
    expect(await screen.findByText("My take.")).toBeInTheDocument();
    expect(textbox).toHaveValue("");
  });
});
