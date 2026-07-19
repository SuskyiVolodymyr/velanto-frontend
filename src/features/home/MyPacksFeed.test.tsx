import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { MyPacksFeed } from "./MyPacksFeed";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock("@/src/shared/lib/packs-client", () => ({
  packsClient: { list: vi.fn() },
}));

function draftPack(id: string): Pack {
  return {
    id,
    title: `Draft ${id}`,
    description: "A work in progress.",
    coverTone: "#2b2a3a",
    format: "save_one",
    language: "en",
    tags: [],
    groups: [{ id: "g1", name: "g", items: [] }],
    rounds: [{ id: "r1", slots: [{ groupId: "g1", mode: "manual" }] }],
    authorId: "u1",
    createdAt: "2026-01-01T00:00:00.000Z",
    totalPlays: 0,
    avgAgreementPercent: 0,
    status: "draft",
    rejectionReason: null,
    score: 0,
    likes: 0,
    dislikes: 0,
    myVote: null,
  };
}

function mockSession(id = "u1") {
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "t",
    user: {
      id,
      email: "a@example.com",
      username: "alice",
      role: "user",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  });
}

function renderFeed() {
  return render(
    <AuthProvider>
      <MyPacksFeed />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MyPacksFeed", () => {
  it("fetches the signed-in user's own packs (no status filter) on mount", async () => {
    mockSession("u1");
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [draftPack("p1")],
      total: 1,
      page: 1,
      limit: 25,
    });

    renderFeed();

    expect(await screen.findByText("Draft p1")).toBeInTheDocument();
    await waitFor(() =>
      expect(packsClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: "u1", status: undefined }),
      ),
    );
  });

  it("filters to drafts when the Drafts chip is selected", async () => {
    mockSession("u1");
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 25,
    });

    renderFeed();
    await screen.findByRole("button", { name: "Draft" });

    await userEvent.click(screen.getByRole("button", { name: "Draft" }));

    await waitFor(() =>
      expect(packsClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: "u1", status: "draft" }),
      ),
    );
  });

  it("shows an empty message when the user has no packs", async () => {
    mockSession("u1");
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 25,
    });

    renderFeed();

    expect(
      await screen.findByText("You haven't created any packs yet."),
    ).toBeInTheDocument();
  });
});
