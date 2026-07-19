import type { ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";
import messages from "@/messages/en.json";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
import {
  StreamerModeProvider,
  useStreamerMode,
} from "@/src/shared/lib/streamer-mode-context";
import { PackCreatorCard } from "./PackCreatorCard";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { Pack } from "@/src/shared/types/pack";
import type { User } from "@/src/shared/types/user";
import { useEffect } from "react";

vi.mock("@/src/shared/lib/users-client");
vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/auth-context");

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/packs/pack-1",
}));

const mockedUsersClient = vi.mocked(usersClient);
const mockedPacksClient = vi.mocked(packsClient);
const mockedUseAuth = vi.mocked(useAuth);

const profile = {
  id: "author-1",
  username: "quizmaster",
  bio: "I make brutal anime elimination packs",
  createdAt: "2026-01-01T00:00:00.000Z",
  followerCount: 12,
  followingCount: 5,
  isFollowedByMe: false,
};

function makePack(overrides: Partial<Pack> = {}): Pack {
  return {
    id: "pack-1",
    title: "Best Pack",
    description: "A great pack",
    coverTone: "#2b2a3a",
    format: "save_one",
    language: "en",
    tags: [],
    groups: [],
    rounds: [{ id: "r1", slots: [{ groupId: "g1", mode: "manual" }] }],
    authorId: "author-1",
    createdAt: "2026-02-01T00:00:00.000Z",
    totalPlays: 0,
    avgAgreementPercent: 0,
    status: "approved",
    rejectionReason: null,
    score: 0,
    likes: 0,
    dislikes: 0,
    myVote: null,
    ...overrides,
  };
}

function mockAuth(user: User | null) {
  mockedUseAuth.mockReturnValue({
    user,
    status: user ? "authenticated" : "unauthenticated",
    login: vi.fn(),
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setAvatarKey: vi.fn(),
    patchUser: vi.fn(),
    revalidate: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

function renderCard(ui: ReactElement) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

// Flips streamer mode on so suppression can be asserted; renders children only
// once the provider reports enabled, matching how the real toggle behaves.
function StreamerOn({ children }: { children: ReactElement }) {
  const { enabled, setEnabled } = useStreamerMode();
  useEffect(() => {
    if (!enabled) setEnabled(true);
  }, [enabled, setEnabled]);
  return enabled ? children : null;
}

describe("PackCreatorCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    push.mockClear();
    mockAuth(null);
    mockedUsersClient.getProfile.mockResolvedValue({ ...profile });
    mockedPacksClient.list.mockResolvedValue({
      items: [],
      total: 5,
      page: 1,
      limit: 1,
    });
  });

  it("shows the author's @handle linking to their profile", async () => {
    renderCard(<PackCreatorCard pack={makePack()} />);
    const handle = await screen.findByText("@quizmaster");
    expect(handle).toBeInTheDocument();
    expect(handle.closest("a")).toHaveAttribute("href", "/users/author-1");
  });

  it("shows the published date", async () => {
    renderCard(<PackCreatorCard pack={makePack()} />);
    await screen.findByText("@quizmaster");
    expect(screen.getByText(/Published/)).toBeInTheDocument();
  });

  it("reveals a mini profile with bio, counts and a follow button on hover", async () => {
    mockAuth({
      id: "viewer-1",
      email: "v@x.com",
      username: "viewer",
      role: "user",
      createdAt: "",
    });
    renderCard(<PackCreatorCard pack={makePack()} />);
    const handle = await screen.findByText("@quizmaster");

    await userEvent.hover(handle);

    await waitFor(() =>
      expect(
        screen.getByText("I make brutal anime elimination packs"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/12 followers/)).toBeInTheDocument();
    expect(screen.getByText(/5 packs/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
  });

  it("follows the author optimistically when the follow button is clicked", async () => {
    mockAuth({
      id: "viewer-1",
      email: "v@x.com",
      username: "viewer",
      role: "user",
      createdAt: "",
    });
    mockedUsersClient.follow.mockResolvedValue({ followerCount: 13 });
    renderCard(<PackCreatorCard pack={makePack()} />);
    const handle = await screen.findByText("@quizmaster");
    await userEvent.hover(handle);
    const followButton = await screen.findByRole("button", { name: "Follow" });

    await userEvent.click(followButton);

    expect(mockedUsersClient.follow).toHaveBeenCalledWith("author-1");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Following" }),
      ).toBeInTheDocument(),
    );
  });

  it("keeps the Following state after the card is closed and reopened", async () => {
    mockAuth({
      id: "viewer-1",
      email: "v@x.com",
      username: "viewer",
      role: "user",
      createdAt: "",
    });
    mockedUsersClient.follow.mockResolvedValue({ followerCount: 13 });
    renderCard(<PackCreatorCard pack={makePack()} />);
    const handle = await screen.findByText("@quizmaster");

    await userEvent.hover(handle);
    await userEvent.click(
      await screen.findByRole("button", { name: "Follow" }),
    );
    await screen.findByRole("button", { name: "Following" });

    // Close the card, then reopen it — the follow state must survive.
    await userEvent.unhover(handle);
    await waitFor(() =>
      expect(
        screen.queryByText("I make brutal anime elimination packs"),
      ).not.toBeInTheDocument(),
    );
    await userEvent.hover(handle);

    expect(
      await screen.findByRole("button", { name: "Following" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Follow" }),
    ).not.toBeInTheDocument();
  });

  it("blocks an unauthenticated viewer with a reason tooltip instead of redirecting", async () => {
    mockAuth(null);
    renderCard(<PackCreatorCard pack={makePack()} />);
    const handle = await screen.findByText("@quizmaster");
    await userEvent.hover(handle);
    const followButton = await screen.findByRole("button", { name: "Follow" });
    expect(followButton).toHaveAttribute("aria-disabled", "true");

    await userEvent.hover(followButton);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Log in to follow");

    await userEvent.click(followButton);
    expect(mockedUsersClient.follow).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("omits the follow button on the viewer's own pack", async () => {
    mockAuth({
      id: "author-1",
      email: "a@x.com",
      username: "quizmaster",
      role: "user",
      createdAt: "",
    });
    renderCard(<PackCreatorCard pack={makePack()} />);
    const handle = await screen.findByText("@quizmaster");
    await userEvent.hover(handle);
    await waitFor(() =>
      expect(
        screen.getByText("I make brutal anime elimination packs"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Follow" }),
    ).not.toBeInTheDocument();
  });

  it("suppresses the hover card while streamer mode is on", async () => {
    mockAuth({
      id: "viewer-1",
      email: "v@x.com",
      username: "viewer",
      role: "user",
      createdAt: "",
    });
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <NextIntlClientProvider locale="en" messages={messages}>
          <StreamerModeProvider>
            <StreamerOn>
              <PackCreatorCard pack={makePack()} />
            </StreamerOn>
          </StreamerModeProvider>
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );
    // Wait for the author fetch to resolve, then hover the strip. The mini
    // card must stay suppressed even though the data is available.
    await waitFor(() =>
      expect(mockedUsersClient.getProfile).toHaveBeenCalledWith("author-1"),
    );
    const pill = screen.getByText("View profile");
    await userEvent.hover(pill);
    expect(
      screen.queryByRole("button", { name: "Follow" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("I make brutal anime elimination packs"),
    ).not.toBeInTheDocument();
  });
});
