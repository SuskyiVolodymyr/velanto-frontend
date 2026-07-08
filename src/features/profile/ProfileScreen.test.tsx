import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileScreen } from "./ProfileScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { ApiError } from "@/src/shared/lib/api-client";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: { register: vi.fn(), login: vi.fn(), logout: vi.fn(), refresh: vi.fn() },
}));
vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: { getProfile: vi.fn(), updateProfile: vi.fn(), ban: vi.fn(), unban: vi.fn(), changeRole: vi.fn() },
}));
vi.mock("@/src/shared/lib/packs-client", () => ({
  packsClient: { list: vi.fn(), create: vi.fn(), getById: vi.fn() },
}));

const MOCK_USER = {
  id: "u1",
  email: "a@example.com",
  username: "alice",
  role: "user" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderScreen() {
  return render(
    <AuthProvider>
      <ProfileScreen />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.refresh).mockResolvedValue({ accessToken: "t", user: MOCK_USER });
  vi.mocked(usersClient.getProfile).mockResolvedValue({
    id: "u1",
    username: "alice",
    bio: "I make Anime packs.",
    createdAt: "2026-01-01T00:00:00.000Z",
    followerCount: 3,
    isFollowedByMe: null,
  });
  vi.mocked(packsClient.list).mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
});

describe("ProfileScreen", () => {
  it("shows the username, bio, and follower count", async () => {
    renderScreen();
    expect(await screen.findByText("alice")).toBeInTheDocument();
    expect(screen.getByText("I make Anime packs.")).toBeInTheDocument();
    expect(screen.getByText(/3 followers?/)).toBeInTheDocument();
  });

  it("shows an 'Add a bio' prompt when bio is null", async () => {
    vi.mocked(usersClient.getProfile).mockResolvedValue({
      id: "u1",
      username: "alice",
      bio: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      followerCount: 0,
      isFollowedByMe: null,
    });
    renderScreen();
    expect(await screen.findByText(/add a bio/i)).toBeInTheDocument();
  });

  it("fetches the current user's own packs across every status", async () => {
    renderScreen();
    await screen.findByText("alice");
    expect(packsClient.list).toHaveBeenCalledWith(expect.objectContaining({ authorId: "u1" }));
  });

  it("shows a link to edit the profile", async () => {
    renderScreen();
    await screen.findByText("alice");
    expect(screen.getByRole("link", { name: /edit/i })).toHaveAttribute("href", "/profile/edit");
  });

  it("shows 'no packs yet' when the user has created nothing", async () => {
    renderScreen();
    expect(await screen.findByText(/no packs yet/i)).toBeInTheDocument();
  });

  it("shows a log-in prompt when the viewer is not authenticated", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(new ApiError(401, "Unauthorized", null));
    renderScreen();
    expect(await screen.findByText(/need to be logged in/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/auth?next=%2Fprofile",
    );
  });

  it("renders a pack grid with status badges when packs exist", async () => {
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [
        {
          id: "p1",
          title: "My Pack",
          description: "desc",
          coverTone: "#111",
          format: "save_one",
          tags: [],
          authorId: "u1",
          createdAt: "2026-01-01T00:00:00.000Z",
          totalPlays: 0,
          avgAgreementPercent: 0,
          status: "pending",
          rejectionReason: null,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderScreen();
    expect(await screen.findByText("My Pack")).toBeInTheDocument();
    expect(screen.getByText("Pending review")).toBeInTheDocument();
  });
});
