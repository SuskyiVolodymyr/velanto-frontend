// This suite was the flaky canary of #78: AuthorScreen fired several chained
// client fetches (profile+packs, then ban-history) each committing its own set
// of setStates, so the many `waitFor`s below raced intermediate render states.
// AuthorScreen now drives every fetch through React Query, which commits each
// result deterministically — so these assertions observe stable transitions.
// Every original behavioral assertion is preserved.
import type { ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pickFromDropdown } from "@/src/shared/test/pick-from-dropdown";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";
import messages from "@/messages/en.json";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
import { StreamerModeProvider } from "@/src/shared/lib/streamer-mode-context";
import { AuthorScreen } from "./AuthorScreen";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { rulesClient } from "@/src/shared/lib/rules-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { RulesDocument } from "@/src/shared/types/rules";

vi.mock("@/src/shared/lib/users-client");
vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/rules-client", () => ({
  rulesClient: { getRules: vi.fn() },
}));
vi.mock("@/src/shared/lib/auth-context");

const RULES: RulesDocument = {
  version: 1,
  categories: [
    { id: "spam_manipulation", title: "Spam & Manipulation", rules: [] },
    { id: "hate_discrimination", title: "Hate & Discrimination", rules: [] },
  ],
};

// The BanReasonPicker uses next-intl, so moderator ban flows need a provider.
function renderScreen(ui: ReactElement) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

// Some feature tests mock `authClient.refresh` and wrap components in the real
// `AuthProvider` instead of mocking `auth-context` directly. AuthorScreen needs
// many auth permutations (own profile / other viewer / anonymous / moderator)
// per test, so mocking `useAuth` directly here is deliberate and less
// repetitive than orchestrating
// `authClient.refresh` for every case.
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/users/author-1",
}));

const mockedUsersClient = vi.mocked(usersClient);
const mockedPacksClient = vi.mocked(packsClient);
const mockedRulesClient = vi.mocked(rulesClient);
const mockedUseAuth = vi.mocked(useAuth);

const profile = {
  id: "author-1",
  username: "quizmaster",
  bio: "I make packs",
  createdAt: "2026-01-01T00:00:00.000Z",
  followerCount: 3,
  followingCount: 2,
  isFollowedByMe: false,
};

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  mockedUseAuth.mockReturnValue({
    user: {
      id: "viewer-1",
      email: "v@x.com",
      username: "viewer",
      role: "user",
      createdAt: "",
    },
    status: "authenticated",
    login: vi.fn(),
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setAvatarKey: vi.fn(),
    patchUser: vi.fn(),
    revalidate: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useAuth>);
}

describe("AuthorScreen", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    push.mockReset();
    mockedPacksClient.list.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 50,
    });
    // The screen now renders the recently-played rail, which fetches through
    // this client; default it to empty so these (profile-focused) tests don't
    // exercise it.
    mockedUsersClient.recentlyPlayed.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 8,
    });
    mockedRulesClient.getRules.mockResolvedValue(RULES);
  });

  it("renders the author's username, bio, and follower count", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(screen.getByText("quizmaster")).toBeInTheDocument(),
    );
    expect(screen.getByText("I make packs")).toBeInTheDocument();
    // The stats row (T1) splits each stat into a value/label pair across two
    // elements, so match them separately rather than one combined node.
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Followers")).toBeInTheDocument();
  });

  it("shows a not-found message when the profile 404s", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockRejectedValue(new Error("404"));
    renderScreen(<AuthorScreen authorId="missing" />);
    await waitFor(() =>
      expect(screen.getByText(/doesn't exist/i)).toBeInTheDocument(),
    );
  });

  it("shows Edit profile (not Follow) when viewing your own author page", async () => {
    mockAuth({
      user: {
        id: "author-1",
        email: "a@x.com",
        username: "quizmaster",
        role: "user",
        createdAt: "",
      },
    });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "quizmaster" }),
      ).toBeInTheDocument(),
    );
    // Merged /profile view: manage your own page instead of following it.
    expect(
      // Anchored to the Follow/Following action button — not the "N followers"
      // count button, which is always present and opens the followers list.
      screen.queryByRole("button", { name: /^follow(ing)?$/i }),
    ).not.toBeInTheDocument();
    // T1 adds a second "Edit profile" link (the pencil badge over the avatar)
    // sharing the same accessible name as the button-styled one — both must
    // point at the real edit route.
    const editLinks = screen.getAllByRole("link", { name: /edit profile/i });
    expect(editLinks.length).toBeGreaterThan(0);
    editLinks.forEach((link) =>
      expect(link).toHaveAttribute("href", "/profile/edit"),
    );
  });

  it("toggles Follow to Following and updates the follower count on click", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.follow.mockResolvedValue({ followerCount: 4 });
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(screen.getByText("quizmaster")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Following" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("does not flip the button state when the follow request fails", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.follow.mockRejectedValue(new Error("network"));
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(screen.getByText("quizmaster")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    await waitFor(() =>
      expect(screen.getByText(/couldn't update/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
  });

  it("shows no follow button at all to a signed-out viewer", async () => {
    mockAuth({ user: null, status: "unauthenticated" });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(screen.getByText("quizmaster")).toBeInTheDocument(),
    );

    // Signed out: the follow control is hidden entirely, not rendered blocked.
    expect(
      // Anchored to the Follow/Following action button — not the "N followers"
      // count button, which is always present and opens the followers list.
      screen.queryByRole("button", { name: /^follow(ing)?$/i }),
    ).not.toBeInTheDocument();
    expect(mockedUsersClient.follow).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("hides the follow button while auth is still loading (no self-follow flash on your own page)", async () => {
    // During the initial auth refresh the viewer is unknown, so we can't yet
    // tell whether this is their own page. The follow control must stay hidden
    // until auth settles rather than flashing a Follow button — on your own
    // page that button was aimable at yourself before it flipped to Edit.
    mockAuth({ user: null, status: "loading" });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(screen.getByText("quizmaster")).toBeInTheDocument(),
    );

    expect(
      // Anchored to the Follow/Following action button — not the "N followers"
      // count button, which is always present and opens the followers list.
      screen.queryByRole("button", { name: /^follow(ing)?$/i }),
    ).not.toBeInTheDocument();
    expect(mockedUsersClient.follow).not.toHaveBeenCalled();
  });

  it("renders the author's approved packs in a grid without status badges", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedPacksClient.list.mockResolvedValue({
      items: [
        {
          id: "pack-1",
          title: "Anime Showdown",
          description: "d",
          coverTone: "#111",
          format: "save_one",
          tags: [],
          authorId: "author-1",
          status: "approved",
          rejectionReason: null,
          totalPlays: 0,
          avgAgreementPercent: 0,
          groups: [],
          rounds: [],
        } as never,
      ],
      total: 1,
      page: 1,
      limit: 50,
    });
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(screen.getByText("Anime Showdown")).toBeInTheDocument(),
    );
    expect(mockedPacksClient.list).toHaveBeenCalledWith({
      authorId: "author-1",
      limit: 6,
    });
  });

  it("shows the response's total pack count, not just the number of items returned by the capped fetch", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedPacksClient.list.mockResolvedValue({
      items: [
        {
          id: "pack-1",
          title: "Anime Showdown",
          description: "d",
          coverTone: "#111",
          format: "save_one",
          tags: [],
          authorId: "author-1",
          status: "approved",
          rejectionReason: null,
          totalPlays: 0,
          avgAgreementPercent: 0,
          groups: [],
          rounds: [],
        } as never,
      ],
      total: 60,
      page: 1,
      limit: 50,
    });
    renderScreen(<AuthorScreen authorId="author-1" />);
    // "60" now renders twice — the stat row's value (AuthorProfileHeader) AND
    // the Packs tab's count pill (ProfileTabs) both read packsTotal — so
    // assert on the pair rather than a single unique node.
    await waitFor(() => expect(screen.getAllByText("60")).toHaveLength(2));
  });

  it("does not show ban history or a ban button to a plain-user viewer", async () => {
    mockAuth({
      user: {
        id: "viewer-1",
        email: "v@x.com",
        username: "viewer",
        role: "user",
        createdAt: "",
      },
    });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(screen.getByText("quizmaster")).toBeInTheDocument(),
    );
    expect(mockedUsersClient.banHistory).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /^ban$/i }),
    ).not.toBeInTheDocument();
  });

  it("shows ban history and a ban button to a moderator viewer", async () => {
    mockAuth({
      user: {
        id: "mod-1",
        email: "m@x.com",
        username: "mod",
        role: "moderator",
        createdAt: "",
      },
    });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.banHistory.mockResolvedValue({
      items: [
        {
          actorUsername: "mod2",
          meta: { duration: "week", reason: "spam" },
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(screen.getByText("quizmaster")).toBeInTheDocument(),
    );
    expect(mockedUsersClient.banHistory).toHaveBeenCalledWith("author-1", {
      page: 1,
      limit: 20,
    });
    await waitFor(() => expect(screen.getByText(/spam/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /^ban$/i })).toBeInTheDocument();
  });

  it("renders the human category title for a ban-history reason, not the raw id", async () => {
    mockAuth({
      user: {
        id: "mod-1",
        email: "m@x.com",
        username: "mod",
        role: "moderator",
        createdAt: "",
      },
    });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.banHistory.mockResolvedValue({
      items: [
        {
          actorUsername: "mod2",
          meta: { duration: "week", reason: "spam_manipulation" },
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderScreen(<AuthorScreen authorId="author-1" />);
    // The rules fetch resolves the category id to its human title…
    await waitFor(() =>
      expect(screen.getByText("Spam & Manipulation")).toBeInTheDocument(),
    );
    // …and the raw id is never shown to the moderator.
    expect(screen.queryByText("spam_manipulation")).not.toBeInTheDocument();
  });

  it("shows a loading indicator while ban history fetches, then the empty state when it has no entries", async () => {
    mockAuth({
      user: {
        id: "mod-1",
        email: "m@x.com",
        username: "mod",
        role: "moderator",
        createdAt: "",
      },
    });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    let resolveBanHistory: (value: {
      items: never[];
      total: number;
      page: number;
      limit: number;
    }) => void = () => {};
    mockedUsersClient.banHistory.mockReturnValue(
      new Promise((resolve) => {
        resolveBanHistory = resolve;
      }),
    );
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(screen.getByText(/loading ban history/i)).toBeInTheDocument(),
    );

    resolveBanHistory({ items: [], total: 0, page: 1, limit: 20 });
    await waitFor(() =>
      expect(screen.getByText(/no ban history/i)).toBeInTheDocument(),
    );
  });

  it("hides ban history and the ban button when a moderator views their own page", async () => {
    mockAuth({
      user: {
        id: "author-1",
        email: "a@x.com",
        username: "quizmaster",
        role: "moderator",
        createdAt: "",
      },
    });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "quizmaster" }),
      ).toBeInTheDocument(),
    );
    expect(mockedUsersClient.banHistory).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /^ban$/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the form open with an error when the ban fails, then submits it on retry", async () => {
    mockAuth({
      user: {
        id: "mod-1",
        email: "m@x.com",
        username: "mod",
        role: "moderator",
        createdAt: "",
      },
    });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.banHistory.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    mockedUsersClient.ban.mockRejectedValueOnce(new Error("boom"));
    mockedUsersClient.ban.mockResolvedValue({
      id: "author-1",
      bannedUntil: "2027-01-01T00:00:00.000Z",
    });
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^ban$/i }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: /^ban$/i }));
    // Pick a rule-category reason from the picker (populated by the rules fetch).
    await pickFromDropdown(userEvent, "Reason", "Spam & Manipulation");
    await userEvent.click(screen.getByRole("button", { name: /confirm ban/i }));

    // First attempt rejects: the error shows and the form stays open (the
    // reason picker is still on screen).
    await waitFor(() =>
      expect(screen.getByText(/couldn't ban/i)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Reason")).toBeInTheDocument();

    // Retrying from the still-open form submits the payload.
    await userEvent.click(screen.getByRole("button", { name: /confirm ban/i }));
    await waitFor(() =>
      expect(mockedUsersClient.ban).toHaveBeenLastCalledWith("author-1", {
        duration: "week",
        reason: "spam_manipulation",
      }),
    );
  });

  it("shows an error message when the ban history fetch fails", async () => {
    mockAuth({
      user: {
        id: "mod-1",
        email: "m@x.com",
        username: "mod",
        role: "moderator",
        createdAt: "",
      },
    });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.banHistory.mockRejectedValue(new Error("network"));
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(
        screen.getByText(/couldn't load ban history/i),
      ).toBeInTheDocument(),
    );
  });

  // --- Characterization tests added alongside the F6 decomposition. These lock
  // behaviors that moved into extracted sub-components so the split provably
  // changes nothing: the optimistic unfollow path (AuthorProfileHeader) and
  // streamer-mode name redaction (the <Hidden> usage in AuthorProfileHeader).
  // (The "other"-reason ban payload lives with its owners now: trimming in
  // BanReasonPicker.test, the wiring payload in UsersTab.test.)

  it("toggles Following to Follow and updates the count via unfollow when already followed", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue({
      ...profile,
      isFollowedByMe: true,
      followerCount: 3,
    });
    mockedUsersClient.unfollow.mockResolvedValue({ followerCount: 2 });
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Following" }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Following" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Follow" }),
      ).toBeInTheDocument(),
    );
    expect(mockedUsersClient.unfollow).toHaveBeenCalledWith("author-1");
    expect(mockedUsersClient.follow).not.toHaveBeenCalled();
    // Followers and Following both happen to read "2" here (fixture's
    // followingCount is also 2) — anchor on the Followers stat button's
    // accessible name so this doesn't collide with the Following stat.
    expect(
      screen.getByRole("button", { name: /2\s*followers/i }),
    ).toBeInTheDocument();
  });

  it("redacts the author name behind a Reveal control when streamer mode is on", async () => {
    localStorage.setItem("velanto:streamer-mode", "on");
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <NextIntlClientProvider locale="en" messages={messages}>
          <StreamerModeProvider>
            <AuthorScreen authorId="author-1" />
          </StreamerModeProvider>
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );
    // The non-identity stat line still renders, so the screen has loaded…
    await waitFor(() =>
      expect(screen.getByText("Followers")).toBeInTheDocument(),
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    // …but the username is redacted (never painted as plain text) and a Reveal
    // control stands in for it.
    expect(screen.queryByText("quizmaster")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /reveal/i }).length,
    ).toBeGreaterThan(0);
    localStorage.removeItem("velanto:streamer-mode");
  });

  // --- T7: AuthorScreen shell wiring — ProfileTabs replaces the old always-
  // stacked Packs + Recently-played layout, and the header's stat buttons
  // deep-link into it.

  it("shows only the Packs tab's panel by default; People/History are not mounted", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedPacksClient.list.mockResolvedValue({
      items: [
        {
          id: "pack-1",
          title: "Anime Showdown",
          description: "d",
          coverTone: "#111",
          format: "save_one",
          tags: [],
          authorId: "author-1",
          status: "approved",
          rejectionReason: null,
          totalPlays: 0,
          avgAgreementPercent: 0,
          groups: [],
          rounds: [],
        } as never,
      ],
      total: 1,
      page: 1,
      limit: 50,
    });
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(screen.getByText("Anime Showdown")).toBeInTheDocument(),
    );
    expect(screen.getByRole("tab", { name: /Packs/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // The People tab's own sub-tab switch (Followers/Following) hasn't
    // mounted, so its follow-list fetch never fires.
    expect(mockedUsersClient.followers).not.toHaveBeenCalled();
    expect(mockedUsersClient.following).not.toHaveBeenCalled();
  });

  it("jumps to the People tab with Followers preselected when the Followers stat is clicked", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.followers.mockResolvedValue({
      items: [
        {
          id: "u1",
          username: "alice",
          avatarKey: null,
          role: "user",
          trusted: false,
          isFollowedByMe: false,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(screen.getByText("quizmaster")).toBeInTheDocument(),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /3\s*followers/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /People/ })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    // PeopleTab mounted with its Followers sub-tab preselected, and fetched
    // followers (not following).
    expect(screen.getByRole("tab", { name: "Followers" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // FollowUserRow renders the handle "@"-prefixed (Username's `at` prop).
    await waitFor(() => expect(screen.getByText("@alice")).toBeInTheDocument());
    expect(mockedUsersClient.following).not.toHaveBeenCalled();
  });

  it("jumps to the People tab with Following preselected when the Following stat is clicked, even from an already-open People tab", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.followers.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    mockedUsersClient.following.mockResolvedValue({
      items: [
        {
          id: "u2",
          username: "bob",
          avatarKey: null,
          role: "user",
          trusted: false,
          isFollowedByMe: false,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(screen.getByText("quizmaster")).toBeInTheDocument(),
    );

    // First jump: Followers.
    await userEvent.click(
      screen.getByRole("button", { name: /3\s*followers/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Followers" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );

    // Second jump, from an already-mounted People tab: Following. The `key`
    // remount must pick up the new initialPeopleSubTab even though the tab
    // itself doesn't change.
    await userEvent.click(
      screen.getByRole("button", { name: /2\s*following/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Following" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    await waitFor(() => expect(screen.getByText("@bob")).toBeInTheDocument());
  });
});
