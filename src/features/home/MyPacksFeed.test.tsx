import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState } from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { MyPacksFeed } from "./MyPacksFeed";
import { AuthProvider } from "@/contexts/auth-context";
import { authClient } from "@/api/auth-client";
import { packsClient } from "@/api/packs-client";
import type { Pack } from "@/types/pack";

vi.mock("@/api/auth-client", () => ({
  authClient: {
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock("@/api/packs-client", () => ({
  packsClient: { list: vi.fn() },
}));

// Each rendered PackCard's Friends button needs a mounted router and the
// room-create client — auth here comes from the real AuthProvider below.
//
// The page number lives in the query string now, so this mock has to be a
// working router rather than a pair of spies: `replace` has to actually change
// what `useSearchParams` returns, and changing it has to re-render, or paging
// would appear to do nothing. `useSearchParams` therefore holds React state
// and hands its setter out to `replace` — the smallest thing that behaves like
// the real pair. `replace` is still a spy, so assertions on the URL it wrote
// work as usual.
const replace = vi.fn((url: string) => {
  const query = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  applyParams?.(new URLSearchParams(query));
});
let applyParams: ((next: URLSearchParams) => void) | null = null;
// What the address bar holds when the component first mounts.
let initialParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => "/my-packs",
  useSearchParams: () => {
    const [params, setParams] = useState(initialParams);
    applyParams = setParams;
    return params;
  },
}));
vi.mock("@/features/friends-rooms/friends-rooms-client", () => ({
  friendsRoomsClient: { create: vi.fn() },
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
  applyParams = null;
  initialParams = new URLSearchParams();
});

describe("MyPacksFeed", () => {
  it("fetches the signed-in user's own packs (no status filter) on mount", async () => {
    mockSession("u1");
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [draftPack("p1")],
      total: 1,
      page: 1,
      limit: 15,
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
      limit: 15,
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
      limit: 15,
    });

    renderFeed();

    expect(
      await screen.findByText("You haven't created any packs yet."),
    ).toBeInTheDocument();
  });

  it("defaults to newest first and can be switched to oldest first", async () => {
    mockSession("u1");
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [draftPack("p1")],
      total: 1,
      page: 1,
      limit: 15,
    });

    renderFeed();
    await screen.findByText("Draft p1");
    await waitFor(() =>
      expect(packsClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: "u1", sort: "newest" }),
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: "Oldest first" }));

    await waitFor(() =>
      expect(packsClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: "u1", sort: "oldest" }),
      ),
    );
  });

  it("restarts at page 1 when the sort order changes", async () => {
    mockSession("u1");
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [draftPack("p1")],
      total: 30,
      page: 1,
      limit: 15,
    });

    renderFeed();
    await screen.findByText("Draft p1");
    await userEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() =>
      expect(packsClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: "Oldest first" }));

    await waitFor(() =>
      expect(packsClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "oldest", page: undefined }),
      ),
    );
  });
});

// velanto-frontend#443 — the page used to be component state, so opening a pack
// from page 3 and pressing Back landed you on page 1 with the list re-fetched
// from the top. Putting it in the query string makes the URL the whole state:
// Back, a reload and a copied link all return to the same page.
describe("MyPacksFeed keeps the page in the URL", () => {
  function page(n: number) {
    return {
      items: [draftPack(`p${n}`)],
      // Four pages at 15 a page, so the pagination control renders.
      total: 50,
      page: n,
      limit: 15,
    };
  }

  it("reads the starting page from the query string", async () => {
    mockSession("u1");
    initialParams = new URLSearchParams("page=3");
    vi.mocked(packsClient.list).mockResolvedValue(page(3));

    renderFeed();

    await waitFor(() =>
      expect(packsClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: "u1", page: 3 }),
      ),
    );
  });

  it("writes the page to the URL when the reader pages forward", async () => {
    mockSession("u1");
    vi.mocked(packsClient.list).mockResolvedValue(page(1));

    renderFeed();
    const next = await screen.findByRole("button", { name: "Next" });

    await userEvent.click(next);

    expect(replace).toHaveBeenCalledWith("/my-packs?page=2", { scroll: false });
  });

  it("drops the parameter entirely on page 1, rather than writing ?page=1", async () => {
    mockSession("u1");
    initialParams = new URLSearchParams("page=2");
    vi.mocked(packsClient.list).mockResolvedValue(page(2));

    renderFeed();
    const prev = await screen.findByRole("button", { name: "Previous" });

    await userEvent.click(prev);

    expect(replace).toHaveBeenCalledWith("/my-packs", { scroll: false });
  });

  // Narrowing while deep in the list must not strand the reader on a page the
  // filtered result no longer has — it restarted at 1 before, and still must,
  // now that the page is in the URL rather than in state.
  it("returns to page 1 when a filter changes", async () => {
    mockSession("u1");
    initialParams = new URLSearchParams("page=3");
    vi.mocked(packsClient.list).mockResolvedValue(page(3));

    renderFeed();
    await screen.findByRole("button", { name: "Draft" });

    await userEvent.click(screen.getByRole("button", { name: "Draft" }));

    expect(replace).toHaveBeenCalledWith("/my-packs", { scroll: false });
  });

  it("ignores a junk page parameter instead of asking the API for it", async () => {
    mockSession("u1");
    initialParams = new URLSearchParams("page=-4");
    vi.mocked(packsClient.list).mockResolvedValue(page(1));

    renderFeed();

    await waitFor(() => expect(packsClient.list).toHaveBeenCalled());
    expect(packsClient.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: undefined }),
    );
  });
});
