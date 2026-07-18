import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { FeedbackComments } from "./FeedbackComments";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { ApiError } from "@/src/shared/lib/api-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { FeedbackComment } from "@/src/shared/types/feedback";

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
          username: "alice",
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
    mockedFeedbackClient.listComments.mockResolvedValue({
      items: [COMMENT_A],
      total: 1,
      page: 1,
      limit: 10,
    });

    render(<FeedbackComments feedbackId="f1" />);

    expect(await screen.findByText("bob")).toBeInTheDocument();
    expect(screen.getByText("Loved this.")).toBeInTheDocument();
    expect(mockedFeedbackClient.listComments).toHaveBeenCalledWith("f1", {
      page: 1,
      limit: 10,
    });
  });

  it("shows a blocked composer with a reason tooltip when unauthenticated", async () => {
    mockAuth(false);
    mockedFeedbackClient.listComments.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    render(<FeedbackComments feedbackId="f1" />);

    const textarea = await screen.findByRole("textbox");
    expect(textarea).toHaveAttribute("readonly");
    expect(textarea).toHaveAttribute("placeholder", "Log in to comment");

    const post = screen.getByRole("button", { name: "Post" });
    expect(post).toHaveAttribute("aria-disabled", "true");

    await userEvent.hover(textarea);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Log in to comment");

    await userEvent.click(post);
    expect(mockedFeedbackClient.addComment).not.toHaveBeenCalled();
  });

  it("posts a comment and prepends it, clearing the draft", async () => {
    mockAuth(true);
    mockedFeedbackClient.listComments.mockResolvedValue({
      items: [COMMENT_A],
      total: 1,
      page: 1,
      limit: 10,
    });
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
      expect(mockedFeedbackClient.addComment).toHaveBeenCalledWith("f1", {
        body: "My take.",
      }),
    );
    expect(await screen.findByText("My take.")).toBeInTheDocument();
    expect(textbox).toHaveValue("");
  });

  it("surfaces the backend's blocked-term rejection inline and keeps the draft", async () => {
    mockAuth(true);
    mockedFeedbackClient.listComments.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    // Real nestjs-zod validation 400 shape: the moderation rejection lives
    // under `errors[]`. The comment text itself is innocuous.
    mockedFeedbackClient.addComment.mockRejectedValue(
      new ApiError(400, "Bad Request", {
        statusCode: 400,
        message: "Validation failed",
        errors: [
          {
            code: "custom",
            path: ["body"],
            message:
              "This text contains language that isn't allowed on Velanto.",
          },
        ],
      }),
    );

    render(<FeedbackComments feedbackId="f1" />);

    const textbox = await screen.findByRole("textbox");
    await userEvent.type(textbox, "My take.");
    await userEvent.click(screen.getByRole("button", { name: "Post" }));

    expect(
      await screen.findByText(
        "This text contains language that isn't allowed on Velanto.",
      ),
    ).toBeInTheDocument();
    expect(textbox).toHaveValue("My take.");
  });
});
