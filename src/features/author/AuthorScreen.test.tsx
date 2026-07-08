import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthorScreen } from "./AuthorScreen";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/users-client");
vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/auth-context");

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
    user: { id: "viewer-1", email: "v@x.com", username: "viewer", role: "user", createdAt: "" },
    status: "authenticated",
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useAuth>);
}

describe("AuthorScreen", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    push.mockReset();
    mockedPacksClient.list.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });
  });

  it("renders the author's username, bio, and follower count", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("quizmaster")).toBeInTheDocument());
    expect(screen.getByText("I make packs")).toBeInTheDocument();
    // The follower count and pack count render as one combined stat line
    // ("3 followers · 0 packs"), so match the substring, not the whole node.
    expect(screen.getByText(/3 followers/)).toBeInTheDocument();
  });

  it("shows a not-found message when the profile 404s", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockRejectedValue(new Error("404"));
    render(<AuthorScreen authorId="missing" />);
    await waitFor(() => expect(screen.getByText(/doesn't exist/i)).toBeInTheDocument());
  });

  it("hides the Follow button when viewing your own author page", async () => {
    mockAuth({ user: { id: "author-1", email: "a@x.com", username: "quizmaster", role: "user", createdAt: "" } });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("quizmaster")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /follow/i })).not.toBeInTheDocument();
  });

  it("toggles Follow to Following and updates the follower count on click", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.follow.mockResolvedValue({ followerCount: 4 });
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("quizmaster")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Following" })).toBeInTheDocument());
    expect(screen.getByText(/4 followers/)).toBeInTheDocument();
  });

  it("does not flip the button state when the follow request fails", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.follow.mockRejectedValue(new Error("network"));
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("quizmaster")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    await waitFor(() => expect(screen.getByText(/couldn't update/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
  });

  it("redirects an anonymous viewer to /auth on Follow click instead of calling the API", async () => {
    mockAuth({ user: null, status: "unauthenticated" });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("quizmaster")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(mockedUsersClient.follow).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/auth?next=%2Fusers%2Fauthor-1");
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
        } as never,
      ],
      total: 1,
      page: 1,
      limit: 50,
    });
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("Anime Showdown")).toBeInTheDocument());
    expect(mockedPacksClient.list).toHaveBeenCalledWith({ authorId: "author-1", limit: 50 });
  });
});
