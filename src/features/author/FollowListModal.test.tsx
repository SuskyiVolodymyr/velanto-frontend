import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient as render } from "@/src/shared/test/render-with-query-client";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { FollowListModal } from "./FollowListModal";
import { StreamerModeProvider } from "@/src/shared/lib/streamer-mode-context";
import { usersClient } from "@/src/shared/lib/users-client";
import type { FollowListKind } from "./api/follow-list.queries";

vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: {
    followers: vi.fn(),
    following: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
  },
}));

const FOLLOWER = {
  id: "u2",
  username: "bob",
  avatarKey: null,
  role: "user" as const,
  trusted: false,
  isFollowedByMe: false,
};
// A row with no known follow state (anonymous viewer, or the viewer's own row).
const SELF = { ...FOLLOWER, id: "u3", username: "me", isFollowedByMe: null };

function renderModal(initialTab: FollowListKind = "followers") {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <StreamerModeProvider>
        <FollowListModal
          authorId="author-1"
          initialTab={initialTab}
          onClose={vi.fn()}
        />
      </StreamerModeProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usersClient.followers).mockResolvedValue({
    items: [FOLLOWER, SELF],
    total: 2,
    page: 1,
    limit: 20,
  });
  vi.mocked(usersClient.following).mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    limit: 20,
  });
});

describe("FollowListModal", () => {
  it("lists followers; only rows with a known follow state get a Follow button", async () => {
    renderModal();

    // Two rows link to their profiles…
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(2));
    expect(screen.getByRole("link", { name: /bob/ })).toHaveAttribute(
      "href",
      "/users/u2",
    );
    // …but only bob (isFollowedByMe=false) can be followed; the null row can't.
    expect(screen.getAllByRole("button", { name: "Follow" })).toHaveLength(1);
    expect(usersClient.followers).toHaveBeenCalledWith("author-1", {
      page: 1,
      limit: 20,
    });
  });

  it("follows a listed user and flips their button to Following", async () => {
    vi.mocked(usersClient.follow).mockResolvedValue({ followerCount: 5 });
    renderModal();
    await screen.findByRole("button", { name: "Follow" });

    await userEvent.click(screen.getByRole("button", { name: "Follow" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Following" }),
      ).toBeInTheDocument(),
    );
    expect(usersClient.follow).toHaveBeenCalledWith("u2");
  });

  it("switches to the Following tab and shows its empty state", async () => {
    renderModal();
    await screen.findByRole("button", { name: "Follow" });

    await userEvent.click(screen.getByRole("tab", { name: "Following" }));

    expect(
      await screen.findByText("Not following anyone yet."),
    ).toBeInTheDocument();
    expect(usersClient.following).toHaveBeenCalledWith("author-1", {
      page: 1,
      limit: 20,
    });
  });
});
