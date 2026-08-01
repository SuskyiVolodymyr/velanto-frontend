import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { PeopleTab } from "./PeopleTab";
import { StreamerModeProvider } from "@/src/shared/lib/streamer-mode-context";
import { usersClient } from "@/src/shared/lib/users-client";
import type { PeopleSubTab } from "./AuthorProfileHeader";

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

function renderPeopleTab(initialSubTab: PeopleSubTab = "followers") {
  return render(
    <StreamerModeProvider>
      <PeopleTab authorId="author-1" initialSubTab={initialSubTab} />
    </StreamerModeProvider>,
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

describe("PeopleTab", () => {
  it("renders the Followers/Following sub-tab switch with Followers selected by default", () => {
    renderPeopleTab();

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(screen.getByRole("tab", { name: "Followers" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Following" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("honors initialSubTab to start on the Following tab", () => {
    renderPeopleTab("following");

    expect(screen.getByRole("tab", { name: "Following" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(usersClient.following).toHaveBeenCalledWith("author-1", {
      page: 1,
      limit: 20,
    });
  });

  it("lists followers from useFollowList; only rows with a known follow state get a Follow button", async () => {
    renderPeopleTab();

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
    renderPeopleTab();
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
    renderPeopleTab();
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

  it("shows the empty state for the Followers tab when there are no followers", async () => {
    vi.mocked(usersClient.followers).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    renderPeopleTab();

    expect(await screen.findByText("No followers yet.")).toBeInTheDocument();
  });

  it('shows "Load more" and appends a page when clicked', async () => {
    vi.mocked(usersClient.followers)
      .mockResolvedValueOnce({
        items: [FOLLOWER],
        total: 3,
        page: 1,
        limit: 20,
      })
      .mockResolvedValueOnce({ items: [SELF], total: 3, page: 2, limit: 20 });

    renderPeopleTab();

    await screen.findByRole("link", { name: /bob/ });
    expect(screen.queryByRole("link", { name: /me/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /me/ })).toBeInTheDocument(),
    );
    expect(usersClient.followers).toHaveBeenCalledWith("author-1", {
      page: 2,
      limit: 20,
    });
  });
});
