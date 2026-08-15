// src/features/admin/OverviewTab.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { OverviewTab } from "./OverviewTab";
import { adminClient } from "@/src/shared/lib/admin-client";

// OverviewTab embeds ActivityChart, which keeps its range in the URL — so the
// tab now needs a router even in tests that never touch the chart.
const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/admin",
  useSearchParams: () => searchParams,
}));

vi.mock("@/src/shared/lib/admin-client", () => ({
  adminClient: { overview: vi.fn(), activity: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminClient.activity).mockResolvedValue([]);
  searchParams = new URLSearchParams();
});

describe("OverviewTab — plays chart", () => {
  // Each bar exposes its exact count, so hovering (or tabbing to) a bar tells
  // you the number instead of leaving you to eyeball the height.
  it("gives every bar a focusable control naming its exact play count", async () => {
    vi.mocked(adminClient.overview).mockResolvedValue({
      registeredUsers: 0,
      packs: 0,
      plays: 0,
      onlineUsers: 0,
      livePlayers: { unique: 0, registered: 0, guests: 0, anonymous: 0 },
      pendingReports: 0,
      pendingPacks: 0,
      newUsersThisWeek: 0,
      newPacksThisWeek: 0,
      playsThisWeek: 5,
      playsLast7Days: [
        { date: "2026-07-08", plays: 0 },
        { date: "2026-07-09", plays: 0 },
        { date: "2026-07-10", plays: 2 },
        { date: "2026-07-11", plays: 0 },
        { date: "2026-07-12", plays: 0 },
        { date: "2026-07-13", plays: 0 },
        { date: "2026-07-14", plays: 3 },
      ],
      topPacksToday: [],
      storage: { usedBytes: 0, ceilingBytes: 5 * 1024 * 1024 * 1024 },
    });
    render(<OverviewTab />);

    expect(
      await screen.findByRole("button", { name: "2 plays on 2026-07-10" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "3 plays on 2026-07-14" }),
    ).toBeInTheDocument();
    // A zero day still gets its own bar and label — the week is never collapsed.
    expect(
      screen.getByRole("button", { name: "0 plays on 2026-07-11" }),
    ).toBeInTheDocument();
  });
});

describe("OverviewTab", () => {
  it("shows a loading state before the fetch resolves", () => {
    vi.mocked(adminClient.overview).mockReturnValue(new Promise(() => {}));
    render(<OverviewTab />);
    expect(screen.getByText("Loading overview…")).toBeInTheDocument();
  });

  it("renders every metric as a real count, with no dash left", async () => {
    vi.mocked(adminClient.overview).mockResolvedValue({
      registeredUsers: 42,
      packs: 7,
      plays: 130,
      onlineUsers: 9,
      livePlayers: { unique: 9, registered: 6, guests: 2, anonymous: 1 },
      pendingReports: 4,
      pendingPacks: 0,
      newUsersThisWeek: 0,
      newPacksThisWeek: 0,
      playsThisWeek: 0,
      playsLast7Days: [],
      topPacksToday: [],
      storage: { usedBytes: 0, ceilingBytes: 5 * 1024 * 1024 * 1024 },
    });

    render(<OverviewTab />);

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("130")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    // The presence card now reports UNIQUE PLAYERS, not signed-in accounts —
    // `onlineUsers` is still on the wire but no longer the number shown, since
    // it misses everyone playing signed-out (velanto-backend#312).
    expect(screen.getByText("9")).toBeInTheDocument();
    // onlineUsers was the last null metric. With presence tracking shipped every
    // card carries a real number, so a dash now means a genuine load problem.
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("shows an error message when the fetch rejects", async () => {
    vi.mocked(adminClient.overview).mockRejectedValue(
      new Error("network error"),
    );
    render(<OverviewTab />);
    expect(
      await screen.findByText(/Couldn't load overview/),
    ).toBeInTheDocument();
  });
});

// #254: nothing showed storage, so the only way to know whether the global
// ceiling was close was to query the database.
describe("OverviewTab — storage", () => {
  it("shows what is stored now against the ceiling", async () => {
    vi.mocked(adminClient.overview).mockResolvedValue({
      registeredUsers: 0,
      packs: 0,
      plays: 0,
      onlineUsers: 0,
      livePlayers: { unique: 0, registered: 0, guests: 0, anonymous: 0 },
      pendingReports: 0,
      pendingPacks: 0,
      newUsersThisWeek: 0,
      newPacksThisWeek: 0,
      playsThisWeek: 0,
      playsLast7Days: [],
      topPacksToday: [],
      storage: {
        usedBytes: 1_500_000_000,
        ceilingBytes: 5 * 1024 * 1024 * 1024,
      },
    });

    render(<OverviewTab />);

    expect(await screen.findByText("1.4 GB")).toBeInTheDocument();
    expect(screen.getByText("of 5 GB")).toBeInTheDocument();
  });
});

describe("OverviewTab — unique players", () => {
  const overviewWith = (livePlayers: {
    unique: number;
    registered: number;
    guests: number;
    anonymous: number;
  }) => ({
    registeredUsers: 0,
    packs: 0,
    plays: 0,
    onlineUsers: 0,
    livePlayers,
    pendingReports: 0,
    pendingPacks: 0,
    newUsersThisWeek: 0,
    newPacksThisWeek: 0,
    playsThisWeek: 0,
    playsLast7Days: [],
    topPacksToday: [],
    storage: { usedBytes: 0, ceilingBytes: 5 * 1024 * 1024 * 1024 },
  });

  // The headline figure is the whole point of velanto-backend#312: before it,
  // only signed-in accounts were visible and everyone playing signed-out —
  // which is most of a party-game audience — was missing from the dashboard.
  it("shows the unique-player total, not just signed-in accounts", async () => {
    vi.mocked(adminClient.overview).mockResolvedValue(
      overviewWith({ unique: 17, registered: 12, guests: 5, anonymous: 0 }),
    );
    render(<OverviewTab />);

    expect(await screen.findByText("17")).toBeInTheDocument();
  });

  // A breakdown that does not add up to its own headline is worse than none.
  it("breaks the total into parts that sum to it", async () => {
    vi.mocked(adminClient.overview).mockResolvedValue(
      overviewWith({ unique: 20, registered: 12, guests: 5, anonymous: 3 }),
    );
    render(<OverviewTab />);

    expect(
      await screen.findByText("12 accounts · 5 guests · 3 anonymous"),
    ).toBeInTheDocument();
  });

  // "Online" would promise a headcount this number cannot deliver: shared IPs
  // collapse and one person on two devices counts twice. The label has to stay
  // honest about what was actually measured.
  it("labels the figure as players rather than as people online", async () => {
    vi.mocked(adminClient.overview).mockResolvedValue(
      overviewWith({ unique: 3, registered: 3, guests: 0, anonymous: 0 }),
    );
    render(<OverviewTab />);

    expect(await screen.findByText("Unique players")).toBeInTheDocument();
  });
});

describe("OverviewTab — moderation queue", () => {
  // Separate from pending REPORTS on purpose: a report is someone flagging
  // published content, a pending pack is an author waiting to be let through.
  // One being zero says nothing about the other, so they get their own cards.
  it("shows packs waiting for a moderator, apart from reports", async () => {
    vi.mocked(adminClient.overview).mockResolvedValue({
      registeredUsers: 0,
      packs: 0,
      plays: 0,
      onlineUsers: 0,
      livePlayers: { unique: 0, registered: 0, guests: 0, anonymous: 0 },
      pendingReports: 2,
      pendingPacks: 6,
      newUsersThisWeek: 0,
      newPacksThisWeek: 0,
      playsThisWeek: 0,
      playsLast7Days: [],
      topPacksToday: [],
      storage: { usedBytes: 0, ceilingBytes: 5 * 1024 * 1024 * 1024 },
    });
    render(<OverviewTab />);

    expect(await screen.findByText("Packs in review")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
