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
  it("fetches and renders existing comments with author and body", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue([COMMENT_A]);
    renderAsUnauthenticated();

    expect(await screen.findByText("bob")).toBeInTheDocument();
    expect(screen.getByText("Loved this pack.")).toBeInTheDocument();
    expect(commentsClient.list).toHaveBeenCalledWith("pack-1");
  });

  it("shows the comment count in the header", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue([COMMENT_A]);
    renderAsUnauthenticated();

    expect(await screen.findByText("Comments · 1")).toBeInTheDocument();
  });

  it("shows an empty state when there are no comments yet", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue([]);
    renderAsUnauthenticated();

    expect(await screen.findByText("No comments yet.")).toBeInTheDocument();
  });

  it("shows a log-in prompt instead of a compose form when unauthenticated", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue([]);
    renderAsUnauthenticated();

    expect(await screen.findByText(/log in/i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows a compose form when authenticated", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue([]);
    renderAsAuthenticated();

    expect(await screen.findByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post" })).toBeInTheDocument();
  });

  it("disables the Post button while the draft is empty", async () => {
    vi.mocked(commentsClient.list).mockResolvedValue([]);
    renderAsAuthenticated();

    const postButton = await screen.findByRole("button", { name: "Post" });
    expect(postButton).toBeDisabled();
  });

  it("posts a comment and prepends it to the list, then clears the draft", async () => {
    const user = userEvent.setup();
    vi.mocked(commentsClient.list).mockResolvedValue([COMMENT_A]);
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
});
