import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentSection } from "./CommentSection";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { commentsClient } from "@/src/shared/lib/comments-client";
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
  vi.mocked(authClient.refresh).mockResolvedValue({ accessToken: "token", user: USER });
  return render(
    <AuthProvider>
      <CommentSection packId="pack-1" />
    </AuthProvider>,
  );
}

function renderAsUnauthenticated() {
  vi.mocked(authClient.refresh).mockRejectedValue(new Error("no session"));
  return render(
    <AuthProvider>
      <CommentSection packId="pack-1" />
    </AuthProvider>,
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
    expect(commentsClient.list).toHaveBeenCalledWith("pack-1", { page: 1, limit: 10 });
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
    vi.mocked(commentsClient.list).mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
    renderAsUnauthenticated();

    expect(await screen.findByText("No comments yet.")).toBeInTheDocument();
  });

  it("shows a log-in prompt instead of a compose form when unauthenticated", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
    renderAsUnauthenticated();

    expect(await screen.findByText(/log in/i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows a compose form when authenticated", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
    renderAsAuthenticated();

    expect(await screen.findByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post" })).toBeInTheDocument();
  });

  it("disables the Post button while the draft is empty", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
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
      expect(commentsClient.create).toHaveBeenCalledWith("pack-1", { body: "My take too." }),
    );
    expect(await screen.findByText("My take too.")).toBeInTheDocument();
    expect(textbox).toHaveValue("");
  });

  it("shows an error and keeps the draft when posting fails", async () => {
    const user = userEvent.setup();
    vi.mocked(commentsClient.list).mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
    vi.mocked(commentsClient.create).mockRejectedValue(new Error("network error"));
    renderAsAuthenticated();

    const textbox = await screen.findByRole("textbox");
    await user.type(textbox, "My take too.");
    await user.click(screen.getByRole("button", { name: "Post" }));

    expect(await screen.findByText("Couldn't post your comment. Try again.")).toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
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

    expect(commentsClient.list).toHaveBeenLastCalledWith("pack-1", { page: 2, limit: 10 });
    expect(await screen.findByText("Second comment.")).toBeInTheDocument();
    expect(screen.getByText("Loved this pack.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
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
    vi.mocked(commentsClient.list).mockRejectedValueOnce(new Error("network error"));
    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(
      await screen.findByText("Couldn't load more comments. Try again."),
    ).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Load more" })).toBeInTheDocument();
  });
});
