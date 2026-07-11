import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient as render } from "@/src/shared/test/render-with-query-client";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { CommentSection } from "./CommentSection";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { StreamerModeProvider } from "@/src/shared/lib/streamer-mode-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { commentsClient } from "@/src/shared/lib/comments-client";
import { ApiError } from "@/src/shared/lib/api-client";
import type { Comment } from "@/src/shared/types/comment";
import type { User } from "@/src/shared/types/user";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock("@/src/shared/lib/comments-client", () => ({
  commentsClient: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

const USER: User = {
  id: "u1",
  email: "alice@example.com",
  username: "alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const COMMENT_A: Comment = {
  id: "c1",
  packId: "pack-1",
  authorId: "u2",
  authorUsername: "bob",
  body: "Loved this pack.",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderAsAuthenticated() {
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "token",
    user: USER,
  });
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <CommentSection packId="pack-1" />
      </AuthProvider>
    </NextIntlClientProvider>,
  );
}

function renderAsUnauthenticated() {
  vi.mocked(authClient.refresh).mockRejectedValue(new Error("no session"));
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <CommentSection packId="pack-1" />
      </AuthProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CommentSection", () => {
  it("fetches page 1 with limit 10 and renders existing comments", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue({
      items: [COMMENT_A],
      total: 1,
      page: 1,
      limit: 10,
    });
    renderAsUnauthenticated();

    expect(await screen.findByText("bob")).toBeInTheDocument();
    expect(screen.getByText("Loved this pack.")).toBeInTheDocument();
    expect(commentsClient.list).toHaveBeenCalledWith("pack-1", {
      page: 1,
      limit: 10,
    });
  });

  it("links each comment author's username to their author page", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue({
      items: [COMMENT_A],
      total: 1,
      page: 1,
      limit: 10,
    });
    renderAsUnauthenticated();

    await screen.findByText("bob");
    const link = screen.getByRole("link", { name: "bob" });
    expect(link).toHaveAttribute("href", "/users/u2");
  });

  it("shows the comment count in the header", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue({
      items: [COMMENT_A],
      total: 1,
      page: 1,
      limit: 10,
    });
    renderAsUnauthenticated();

    expect(await screen.findByText("Comments · 1")).toBeInTheDocument();
  });

  it("shows an empty state when there are no comments yet", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    renderAsUnauthenticated();

    expect(await screen.findByText("No comments yet.")).toBeInTheDocument();
  });

  it("shows a blocked composer with a reason tooltip when unauthenticated", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    renderAsUnauthenticated();

    // The composer is shown but inert: the textarea is read-only and shows the
    // reason as its placeholder, Post is blocked, and hovering the *input*
    // (not just the button) surfaces the reason. Nothing posts.
    const textarea = await screen.findByRole("textbox");
    expect(textarea).toHaveAttribute("readonly");
    expect(textarea).toHaveAttribute("placeholder", "Log in to comment");

    const post = screen.getByRole("button", { name: "Post" });
    expect(post).toHaveAttribute("aria-disabled", "true");

    await userEvent.hover(textarea);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Log in to comment");

    await userEvent.click(post);
    expect(commentsClient.create).not.toHaveBeenCalled();
  });

  it("shows a compose form when authenticated", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    renderAsAuthenticated();

    expect(await screen.findByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post" })).toBeInTheDocument();
  });

  it("disables the Post button while the draft is empty", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    renderAsAuthenticated();

    const postButton = await screen.findByRole("button", { name: "Post" });
    expect(postButton).toBeDisabled();
  });

  it("posts a comment and prepends it to the list, then clears the draft", async () => {
    const user = userEvent.setup();
    vi.mocked(commentsClient.list).mockResolvedValue({
      items: [COMMENT_A],
      total: 1,
      page: 1,
      limit: 10,
    });
    const newComment: Comment = {
      id: "c2",
      packId: "pack-1",
      authorId: "u1",
      authorUsername: "alice",
      body: "My take too.",
      createdAt: "2026-01-02T00:00:00.000Z",
    };
    vi.mocked(commentsClient.create).mockResolvedValue(newComment);
    renderAsAuthenticated();

    const textbox = await screen.findByRole("textbox");
    await user.type(textbox, "My take too.");
    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() =>
      expect(commentsClient.create).toHaveBeenCalledWith("pack-1", {
        body: "My take too.",
      }),
    );
    expect(await screen.findByText("My take too.")).toBeInTheDocument();
    expect(textbox).toHaveValue("");
  });

  it("shows an error and keeps the draft when posting fails", async () => {
    const user = userEvent.setup();
    vi.mocked(commentsClient.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    vi.mocked(commentsClient.create).mockRejectedValue(
      new Error("network error"),
    );
    renderAsAuthenticated();

    const textbox = await screen.findByRole("textbox");
    await user.type(textbox, "My take too.");
    await user.click(screen.getByRole("button", { name: "Post" }));

    expect(
      await screen.findByText("Couldn't post your comment. Try again."),
    ).toBeInTheDocument();
    expect(textbox).toHaveValue("My take too.");
  });

  it("surfaces the backend's blocked-term rejection inline and keeps the draft", async () => {
    const user = userEvent.setup();
    vi.mocked(commentsClient.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    // Real nestjs-zod validation 400 shape: the moderation rejection lives
    // under `errors[]`. The comment text itself is innocuous.
    vi.mocked(commentsClient.create).mockRejectedValue(
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
    renderAsAuthenticated();

    const textbox = await screen.findByRole("textbox");
    await user.type(textbox, "My take too.");
    await user.click(screen.getByRole("button", { name: "Post" }));

    expect(
      await screen.findByText(
        "This text contains language that isn't allowed on Velanto.",
      ),
    ).toBeInTheDocument();
    expect(textbox).toHaveValue("My take too.");
  });

  it("does not show a Load more button when all comments already fit", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue({
      items: [COMMENT_A],
      total: 1,
      page: 1,
      limit: 10,
    });
    renderAsUnauthenticated();

    await screen.findByText("Loved this pack.");
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });

  it("shows a Load more button when more comments exist, and appends the next page on click", async () => {
    const user = userEvent.setup();
    const secondComment: Comment = {
      id: "c2",
      packId: "pack-1",
      authorId: "u3",
      authorUsername: "carol",
      body: "Second comment.",
      createdAt: "2026-01-02T00:00:00.000Z",
    };
    vi.mocked(commentsClient.list).mockResolvedValueOnce({
      items: [COMMENT_A],
      total: 2,
      page: 1,
      limit: 1,
    });
    renderAsUnauthenticated();

    await screen.findByText("Loved this pack.");
    const loadMoreButton = screen.getByRole("button", { name: "Load more" });

    vi.mocked(commentsClient.list).mockResolvedValueOnce({
      items: [secondComment],
      total: 2,
      page: 2,
      limit: 1,
    });
    await user.click(loadMoreButton);

    expect(commentsClient.list).toHaveBeenLastCalledWith("pack-1", {
      page: 2,
      limit: 10,
    });
    expect(await screen.findByText("Second comment.")).toBeInTheDocument();
    expect(screen.getByText("Loved this pack.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });

  it("filters out a comment the next page re-returns after a post shifted server offsets", async () => {
    const user = userEvent.setup();
    const thirdComment: Comment = {
      id: "c3",
      packId: "pack-1",
      authorId: "u4",
      authorUsername: "dave",
      body: "Third comment.",
      createdAt: "2026-01-03T00:00:00.000Z",
    };
    vi.mocked(commentsClient.list).mockResolvedValueOnce({
      items: [COMMENT_A],
      total: 2,
      page: 1,
      limit: 1,
    });
    renderAsUnauthenticated();

    await screen.findByText("Loved this pack.");

    // Simulate the next page re-returning COMMENT_A (already shown) alongside
    // a genuinely new comment — the offset-shift scenario found in review.
    vi.mocked(commentsClient.list).mockResolvedValueOnce({
      items: [COMMENT_A, thirdComment],
      total: 3,
      page: 2,
      limit: 1,
    });
    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Third comment.")).toBeInTheDocument();
    expect(screen.getAllByText("Loved this pack.")).toHaveLength(1);
  });

  it("shows an error when Load more fails", async () => {
    const user = userEvent.setup();
    vi.mocked(commentsClient.list).mockResolvedValueOnce({
      items: [COMMENT_A],
      total: 2,
      page: 1,
      limit: 1,
    });
    renderAsUnauthenticated();

    await screen.findByText("Loved this pack.");
    vi.mocked(commentsClient.list).mockRejectedValueOnce(
      new Error("network error"),
    );
    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(
      await screen.findByText("Couldn't load more comments. Try again."),
    ).toBeInTheDocument();
  });

  describe("streamer mode", () => {
    afterEach(() => localStorage.clear());

    function renderWithStreamerMode() {
      vi.mocked(authClient.refresh).mockRejectedValue(new Error("no session"));
      return render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <AuthProvider>
            <StreamerModeProvider>
              <CommentSection packId="pack-1" />
            </StreamerModeProvider>
          </AuthProvider>
        </NextIntlClientProvider>,
      );
    }

    it("hides a comment's author name and body until each is revealed", async () => {
      const user = userEvent.setup();
      localStorage.setItem("velanto:streamer-mode", "on");
      vi.mocked(commentsClient.list).mockResolvedValue({
        items: [COMMENT_A],
        total: 1,
        page: 1,
        limit: 10,
      });
      renderWithStreamerMode();

      // Wait for the fetch to resolve (header shows the count) then assert the
      // identity + body are redacted rather than shown.
      await screen.findByText("Comments · 1");
      expect(screen.queryByText("bob")).not.toBeInTheDocument();
      expect(screen.queryByText("Loved this pack.")).not.toBeInTheDocument();

      const revealButtons = screen.getAllByRole("button", { name: /reveal/i });
      expect(revealButtons).toHaveLength(2); // one for the name, one for the body

      await user.click(revealButtons[0]);
      await user.click(screen.getAllByRole("button", { name: /reveal/i })[0]);

      expect(screen.getByText("bob")).toBeInTheDocument();
      expect(screen.getByText("Loved this pack.")).toBeInTheDocument();
    });
  });

  it("keeps the Load more button correctly visible after posting a new comment", async () => {
    const user = userEvent.setup();
    vi.mocked(commentsClient.list).mockResolvedValue({
      items: [COMMENT_A],
      total: 2,
      page: 1,
      limit: 1,
    });
    const newComment: Comment = {
      id: "c3",
      packId: "pack-1",
      authorId: "u1",
      authorUsername: "alice",
      body: "New one.",
      createdAt: "2026-01-03T00:00:00.000Z",
    };
    vi.mocked(commentsClient.create).mockResolvedValue(newComment);
    renderAsAuthenticated();

    const textbox = await screen.findByRole("textbox");
    await user.type(textbox, "New one.");
    await user.click(screen.getByRole("button", { name: "Post" }));

    expect(await screen.findByText("New one.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Load more" }),
    ).toBeInTheDocument();
  });
});
