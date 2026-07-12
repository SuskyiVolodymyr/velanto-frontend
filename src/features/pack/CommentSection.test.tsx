import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
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
    requestEmailCode: vi.fn(),
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
    delete: vi.fn(),
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

// Render authenticated as a chosen user, with an explicit pack author id — used
// by the delete-affordance tests to exercise the author/pack-author/staff paths.
function renderAuthedAs(user: User, packAuthorId?: string) {
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "token",
    user,
  });
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <CommentSection packId="pack-1" packAuthorId={packAuthorId} />
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

  describe("delete affordance", () => {
    const MODERATOR: User = { ...USER, id: "mod-1", role: "moderator" };
    const OWN_COMMENT: Comment = { ...COMMENT_A, id: "c-own", authorId: "u1" };

    function listOnce(items: Comment[]) {
      vi.mocked(commentsClient.list).mockResolvedValue({
        items,
        total: items.length,
        page: 1,
        limit: 10,
      });
    }

    it("shows a delete button when the viewer is the pack author", async () => {
      listOnce([COMMENT_A]); // authored by u2
      renderAuthedAs(USER, "u1"); // u1 owns the pack

      expect(
        await screen.findByRole("button", { name: "Delete comment" }),
      ).toBeInTheDocument();
    });

    it("shows a delete button on the viewer's own comment", async () => {
      listOnce([OWN_COMMENT]); // authored by u1
      renderAuthedAs(USER, "someone-else");

      expect(
        await screen.findByRole("button", { name: "Delete comment" }),
      ).toBeInTheDocument();
    });

    it("shows a delete button for a staff viewer on anyone's comment", async () => {
      listOnce([COMMENT_A]); // authored by u2
      renderAuthedAs(MODERATOR, "someone-else");

      expect(
        await screen.findByRole("button", { name: "Delete comment" }),
      ).toBeInTheDocument();
    });

    it("hides the delete button from a regular viewer who is neither author, pack author, nor staff", async () => {
      listOnce([COMMENT_A]); // authored by u2
      renderAuthedAs(USER, "someone-else"); // u1, plain user, not pack author

      await screen.findByText("Loved this pack.");
      expect(
        screen.queryByRole("button", { name: "Delete comment" }),
      ).not.toBeInTheDocument();
    });

    it("hides the delete button when unauthenticated", async () => {
      listOnce([COMMENT_A]);
      renderAsUnauthenticated();

      await screen.findByText("Loved this pack.");
      expect(
        screen.queryByRole("button", { name: "Delete comment" }),
      ).not.toBeInTheDocument();
    });

    it("deletes a comment on confirm and removes it from the list", async () => {
      const user = userEvent.setup();
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
      listOnce([COMMENT_A]);
      vi.mocked(commentsClient.delete).mockResolvedValue(undefined);
      renderAuthedAs(MODERATOR, "someone-else");

      await user.click(
        await screen.findByRole("button", { name: "Delete comment" }),
      );

      await waitFor(() =>
        expect(commentsClient.delete).toHaveBeenCalledWith("pack-1", "c1"),
      );
      await waitFor(() =>
        expect(screen.queryByText("Loved this pack.")).not.toBeInTheDocument(),
      );
      // The header count reflects the drop (total decremented in the cache).
      expect(screen.getByText("Comments · 0")).toBeInTheDocument();
      confirm.mockRestore();
    });

    it("does not delete when the confirmation is cancelled", async () => {
      const user = userEvent.setup();
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
      listOnce([COMMENT_A]);
      renderAuthedAs(MODERATOR, "someone-else");

      await user.click(
        await screen.findByRole("button", { name: "Delete comment" }),
      );

      expect(commentsClient.delete).not.toHaveBeenCalled();
      expect(screen.getByText("Loved this pack.")).toBeInTheDocument();
      confirm.mockRestore();
    });

    it("shows an inline error when deletion fails and keeps the comment", async () => {
      const user = userEvent.setup();
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
      listOnce([COMMENT_A]);
      vi.mocked(commentsClient.delete).mockRejectedValue(new Error("boom"));
      renderAuthedAs(MODERATOR, "someone-else");

      await user.click(
        await screen.findByRole("button", { name: "Delete comment" }),
      );

      expect(
        await screen.findByText("Couldn't delete the comment. Try again."),
      ).toBeInTheDocument();
      expect(screen.getByText("Loved this pack.")).toBeInTheDocument();
      confirm.mockRestore();
    });
  });

  describe("threading (replies)", () => {
    const MODERATOR: User = { ...USER, id: "mod-1", role: "moderator" };
    const REPLY: Comment = {
      id: "reply-1",
      packId: "pack-1",
      authorId: "u3",
      authorUsername: "carol",
      body: "I agree with this.",
      createdAt: "2026-01-02T00:00:00.000Z",
      parentId: "c1",
    };
    // COMMENT_A (id c1, body "Loved this pack.") with one embedded reply.
    const ROOT_WITH_REPLY: Comment = {
      ...COMMENT_A,
      replyCount: 1,
      replies: [REPLY],
    };

    function listOnce(items: Comment[]) {
      vi.mocked(commentsClient.list).mockResolvedValue({
        items,
        total: items.length,
        page: 1,
        limit: 10,
      });
    }

    it("renders a root's replies nested beneath it", async () => {
      listOnce([ROOT_WITH_REPLY]);
      renderAsUnauthenticated();

      expect(await screen.findByText("Loved this pack.")).toBeInTheDocument();
      expect(screen.getByText("I agree with this.")).toBeInTheDocument();
      expect(screen.getByText("carol")).toBeInTheDocument();
    });

    it("does not show Reply buttons when unauthenticated", async () => {
      listOnce([ROOT_WITH_REPLY]);
      renderAsUnauthenticated();

      await screen.findByText("I agree with this.");
      expect(
        screen.queryByRole("button", { name: "Reply" }),
      ).not.toBeInTheDocument();
    });

    it("posts a reply with the parent id and appends it under the root", async () => {
      const user = userEvent.setup();
      listOnce([COMMENT_A]); // a root with no replies yet
      const createdReply: Comment = {
        id: "reply-2",
        packId: "pack-1",
        authorId: "u1",
        authorUsername: "alice",
        body: "My reply.",
        createdAt: "2026-01-03T00:00:00.000Z",
        parentId: "c1",
      };
      vi.mocked(commentsClient.create).mockResolvedValue(createdReply);
      renderAsAuthenticated();

      await user.click(await screen.findByRole("button", { name: "Reply" }));
      const replyBox = screen.getByRole("textbox", {
        name: "Reply to comment",
      });
      await user.type(replyBox, "My reply.");
      const composer = replyBox.closest("div") as HTMLElement;
      await user.click(within(composer).getByRole("button", { name: "Post" }));

      await waitFor(() =>
        expect(commentsClient.create).toHaveBeenCalledWith("pack-1", {
          body: "My reply.",
          parentId: "c1",
        }),
      );
      expect(await screen.findByText("My reply.")).toBeInTheDocument();
    });

    it("pre-fills an @mention of the reply's author when replying to a reply", async () => {
      const user = userEvent.setup();
      listOnce([ROOT_WITH_REPLY]);
      renderAsAuthenticated();

      await screen.findByText("I agree with this.");
      // Two Reply buttons — the root's, then the reply's.
      const replyButtons = screen.getAllByRole("button", { name: "Reply" });
      await user.click(replyButtons[1]);

      const replyBox = screen.getByRole("textbox", {
        name: "Reply to comment",
      });
      expect(replyBox).toHaveValue("@carol ");
    });

    it("confirms deleting the whole thread when a root has replies", async () => {
      const user = userEvent.setup();
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
      listOnce([ROOT_WITH_REPLY]);
      renderAuthedAs(MODERATOR, "someone-else");

      const deleteButtons = await screen.findAllByRole("button", {
        name: "Delete comment",
      });
      await user.click(deleteButtons[0]); // the root's delete

      expect(confirm).toHaveBeenCalledWith(
        "Delete this comment and all its replies?",
      );
      confirm.mockRestore();
    });

    it("deletes a reply and drops it from its root without touching the count", async () => {
      const user = userEvent.setup();
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
      listOnce([ROOT_WITH_REPLY]);
      vi.mocked(commentsClient.delete).mockResolvedValue(undefined);
      renderAuthedAs(MODERATOR, "someone-else");

      await screen.findByText("I agree with this.");
      // Root delete is [0], reply delete is [1].
      const deleteButtons = screen.getAllByRole("button", {
        name: "Delete comment",
      });
      await user.click(deleteButtons[1]);

      await waitFor(() =>
        expect(commentsClient.delete).toHaveBeenCalledWith("pack-1", "reply-1"),
      );
      await waitFor(() =>
        expect(
          screen.queryByText("I agree with this."),
        ).not.toBeInTheDocument(),
      );
      // Roots-only total is unchanged by a reply delete.
      expect(screen.getByText("Comments · 1")).toBeInTheDocument();
      expect(screen.getByText("Loved this pack.")).toBeInTheDocument();
      confirm.mockRestore();
    });
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
