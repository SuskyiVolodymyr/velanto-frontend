// This suite was the flaky canary of #78: AuthorScreen fired several chained
// client fetches (profile+packs, then ban-history) each committing its own set
// of setStates, so the many `waitFor`s below raced intermediate render states.
// AuthorScreen now drives every fetch through React Query, which commits each
// result deterministically — so these assertions observe stable transitions.
// Every original behavioral assertion is preserved.
import type { ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// This repo's other feature tests mock `authClient.refresh` and wrap components
// in the real `AuthProvider` instead of mocking `auth-context` directly (see
// ProfileScreen.test.tsx). AuthorScreen needs many auth permutations (own
// profile / other viewer / anonymous / moderator) per test, so mocking
// `useAuth` directly here is deliberate and less repetitive than orchestrating
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
    // The follower count and pack count render as one combined stat line
    // ("3 followers · 0 packs"), so match the substring, not the whole node.
    expect(screen.getByText(/3 followers/)).toBeInTheDocument();
  });

  it("shows a not-found message when the profile 404s", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockRejectedValue(new Error("404"));
    renderScreen(<AuthorScreen authorId="missing" />);
    await waitFor(() =>
      expect(screen.getByText(/doesn't exist/i)).toBeInTheDocument(),
    );
  });

  it("hides the Follow button when viewing your own author page", async () => {
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
      expect(screen.getByText("quizmaster")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /follow/i }),
    ).not.toBeInTheDocument();
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
    expect(screen.getByText(/4 followers/)).toBeInTheDocument();
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

  it("blocks an anonymous viewer with a reason tooltip instead of redirecting on Follow", async () => {
    mockAuth({ user: null, status: "unauthenticated" });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(screen.getByText("quizmaster")).toBeInTheDocument(),
    );
    const followButton = screen.getByRole("button", { name: "Follow" });
    expect(followButton).toHaveAttribute("aria-disabled", "true");

    await userEvent.hover(followButton);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Log in to follow");

    await userEvent.click(followButton);
    expect(mockedUsersClient.follow).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
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
      limit: 50,
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
    await waitFor(() =>
      expect(screen.getByText(/60 packs/)).toBeInTheDocument(),
    );
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

  it("shows an empty-state message when the author has no ban history", async () => {
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
    renderScreen(<AuthorScreen authorId="author-1" />);
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
      expect(screen.getByText("quizmaster")).toBeInTheDocument(),
    );
    expect(mockedUsersClient.banHistory).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /^ban$/i }),
    ).not.toBeInTheDocument();
  });

  it("submits a ban via the inline form and shows the updated status", async () => {
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
    await screen.findByRole("option", { name: "Spam & Manipulation" });
    await userEvent.selectOptions(
      screen.getByLabelText("Reason"),
      "spam_manipulation",
    );
    await userEvent.click(screen.getByRole("button", { name: /confirm ban/i }));
    await waitFor(() =>
      expect(mockedUsersClient.ban).toHaveBeenCalledWith("author-1", {
        duration: "week",
        reason: "spam_manipulation",
      }),
    );
  });

  it("shows an error and keeps the form open when the ban request fails", async () => {
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
    mockedUsersClient.ban.mockRejectedValue(new Error("boom"));
    renderScreen(<AuthorScreen authorId="author-1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^ban$/i }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: /^ban$/i }));
    await screen.findByRole("option", { name: "Spam & Manipulation" });
    await userEvent.selectOptions(
      screen.getByLabelText("Reason"),
      "spam_manipulation",
    );
    await userEvent.click(screen.getByRole("button", { name: /confirm ban/i }));
    await waitFor(() =>
      expect(screen.getByText(/couldn't ban/i)).toBeInTheDocument(),
    );
    // The form stays open (the reason picker is still on screen).
    expect(screen.getByLabelText("Reason")).toBeInTheDocument();
  });

  it("shows a loading indicator while ban history is being fetched", async () => {
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
  // changes nothing: the optimistic unfollow path (AuthorProfileHeader), the ban
  // payload with an "other" reasonDetail (AuthorModeratorPanel + BanReasonPicker),
  // and streamer-mode name redaction (the <Hidden> usage in AuthorProfileHeader).

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
    expect(screen.getByText(/2 followers/)).toBeInTheDocument();
  });

  it("submits a ban with a trimmed reasonDetail when the reason is 'other'", async () => {
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
    await screen.findByRole("option", { name: "Other" });
    await userEvent.selectOptions(screen.getByLabelText("Reason"), "other");
    await userEvent.type(
      screen.getByLabelText("Details (required)"),
      "  posting scam links  ",
    );
    await userEvent.click(screen.getByRole("button", { name: /confirm ban/i }));
    await waitFor(() =>
      expect(mockedUsersClient.ban).toHaveBeenCalledWith("author-1", {
        duration: "week",
        reason: "other",
        reasonDetail: "posting scam links",
      }),
    );
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
      expect(screen.getByText(/3 followers/)).toBeInTheDocument(),
    );
    // …but the username is redacted (never painted as plain text) and a Reveal
    // control stands in for it.
    expect(screen.queryByText("quizmaster")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /reveal/i }).length,
    ).toBeGreaterThan(0);
    localStorage.removeItem("velanto:streamer-mode");
  });
});
