import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { AuthorPackList } from "./AuthorPackList";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/packs-client", () => ({
  packsClient: { list: vi.fn() },
}));

function pack(
  id: string,
  title: string,
  status: Pack["status"] = "approved",
): Pack {
  return {
    id,
    title,
    description: "d",
    coverTone: "#111",
    format: "save_one",
    tags: [],
    groups: [],
    rounds: [],
    authorId: "author-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    totalPlays: 0,
    avgAgreementPercent: 0,
    status,
    rejectionReason: null,
    score: 0,
    likes: 0,
    dislikes: 0,
    myVote: null,
  };
}

const SEED_SIX = Array.from({ length: 6 }, (_, i) =>
  pack(`p${i + 1}`, `Pack ${i + 1}`),
);

beforeEach(() => {
  vi.clearAllMocks();
  // Default: the mount refetch (staleTime 0) re-serves the same first page, so
  // seeded content stays put. Tests that page further override per page below.
  vi.mocked(packsClient.list).mockResolvedValue({
    items: SEED_SIX,
    total: 6,
    page: 1,
    limit: 6,
  });
});

describe("AuthorPackList", () => {
  it("paints the seeded packs immediately", () => {
    render(
      <AuthorPackList
        authorId="author-1"
        initialPacks={SEED_SIX}
        initialTotal={6}
      />,
    );
    // Seeded, so the packs are on screen synchronously — no loading wait.
    expect(screen.getByText("Pack 1")).toBeInTheDocument();
    expect(screen.getByText("Pack 6")).toBeInTheDocument();
  });

  it("hides Load more when the first page already holds every pack", () => {
    render(
      <AuthorPackList
        authorId="author-1"
        initialPacks={SEED_SIX}
        initialTotal={6}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /load more/i }),
    ).not.toBeInTheDocument();
  });

  it("appends the next page of packs when Load more is clicked", async () => {
    const user = userEvent.setup();
    // The mount refetch re-serves page 1 (total 8 so the button stays); Load
    // more fetches page 2.
    vi.mocked(packsClient.list).mockImplementation((filters) =>
      Promise.resolve(
        filters?.page === 2
          ? {
              items: [pack("p7", "Pack 7"), pack("p8", "Pack 8")],
              total: 8,
              page: 2,
              limit: 6,
            }
          : { items: SEED_SIX, total: 8, page: 1, limit: 6 },
      ),
    );
    render(
      <AuthorPackList
        authorId="author-1"
        initialPacks={SEED_SIX}
        initialTotal={8}
      />,
    );
    await screen.findByText("Pack 1");

    await user.click(screen.getByRole("button", { name: /load more/i }));

    expect(await screen.findByText("Pack 7")).toBeInTheDocument();
    expect(screen.getByText("Pack 8")).toBeInTheDocument();
    expect(packsClient.list).toHaveBeenCalledWith({
      authorId: "author-1",
      page: 2,
      limit: 6,
    });
    // All eight now shown → the button is gone.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /load more/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows the empty state for an author with no packs", async () => {
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 6,
    });
    const { unmount } = render(
      <AuthorPackList authorId="author-1" initialPacks={[]} initialTotal={0} />,
    );
    expect(await screen.findByText(/no packs yet/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /load more/i }),
    ).not.toBeInTheDocument();
    unmount();

    // The own-profile variant uses its own, more inviting empty copy.
    render(
      <AuthorPackList
        authorId="author-1"
        initialPacks={[]}
        initialTotal={0}
        own
      />,
    );
    expect(
      await screen.findByText(/create your first one/i),
    ).toBeInTheDocument();
  });

  it("shows status badges only in the own-profile variant", async () => {
    const mine = pack("p1", "Mine", "pending");
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [mine],
      total: 1,
      page: 1,
      limit: 6,
    });
    const { unmount } = render(
      <AuthorPackList
        authorId="author-1"
        initialPacks={[mine]}
        initialTotal={1}
        own
      />,
    );
    expect(await screen.findByText("Pending review")).toBeInTheDocument();
    unmount();

    render(
      <AuthorPackList
        authorId="author-1"
        initialPacks={[pack("p1", "Theirs", "pending")]}
        initialTotal={1}
      />,
    );
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
  });
});
