import type { ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";
import messages from "@/messages/en.json";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
import { PackBannerAuthor } from "./PackBannerAuthor";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/users-client");
vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/auth-context");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/packs/pack-1",
}));

const mockedUsersClient = vi.mocked(usersClient);
const mockedPacksClient = vi.mocked(packsClient);
const mockedUseAuth = vi.mocked(useAuth);

const PACK: Pack = {
  id: "pack-1",
  title: "Best Pack",
  description: "A great pack",
  coverTone: "#2b2a3a",
  format: "save_one",
  tags: [],
  groups: [],
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
};

function renderBanner(ui: ReactElement) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    user: null,
    status: "unauthenticated",
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
  mockedUsersClient.getProfile.mockResolvedValue({
    id: "author-1",
    username: "quizmaster",
    bio: "I make brutal anime elimination packs",
    createdAt: "2026-01-01T00:00:00.000Z",
    followerCount: 12,
    isFollowedByMe: null,
  });
  mockedPacksClient.list.mockResolvedValue({
    items: [],
    total: 5,
    page: 1,
    limit: 1,
  });
});

describe("PackBannerAuthor", () => {
  it("shows the author's @handle linking to their profile", async () => {
    renderBanner(<PackBannerAuthor pack={PACK} />);
    const handle = await screen.findByText("@quizmaster");
    expect(handle.closest("a")).toHaveAttribute("href", "/users/author-1");
  });

  it("falls back to a plain 'view author' link before the author resolves", () => {
    renderBanner(<PackBannerAuthor pack={PACK} />);
    // Synchronously, before the query resolves, the handle isn't known yet.
    expect(screen.queryByText("@quizmaster")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view author/i })).toHaveAttribute(
      "href",
      "/users/author-1",
    );
  });

  it("reveals the shared mini profile on hover", async () => {
    renderBanner(<PackBannerAuthor pack={PACK} />);
    const handle = await screen.findByText("@quizmaster");

    await userEvent.hover(handle);

    await waitFor(() =>
      expect(
        screen.getByText("I make brutal anime elimination packs"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/12 followers/)).toBeInTheDocument();
    expect(screen.getByText(/5 packs/)).toBeInTheDocument();
  });
});
