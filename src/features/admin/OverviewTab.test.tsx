// src/features/admin/OverviewTab.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { OverviewTab } from "./OverviewTab";
import { adminClient } from "@/src/shared/lib/admin-client";

vi.mock("@/src/shared/lib/admin-client", () => ({
  adminClient: { overview: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OverviewTab — plays chart", () => {
  // Each bar exposes its exact count, so hovering (or tabbing to) a bar tells
  // you the number instead of leaving you to eyeball the height.
  it("gives every bar a focusable control naming its exact play count", async () => {
    vi.mocked(adminClient.overview).mockResolvedValue({
      registeredUsers: 0,
      packs: 0,
      plays: 0,
      onlineUsers: null,
      pendingReports: 0,
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

  it("renders real counts, including pendingReports, and a dash only for the null metric", async () => {
    vi.mocked(adminClient.overview).mockResolvedValue({
      registeredUsers: 42,
      packs: 7,
      plays: 130,
      onlineUsers: null,
      pendingReports: 4,
      newUsersThisWeek: 0,
      newPacksThisWeek: 0,
      playsThisWeek: 0,
      playsLast7Days: [],
      topPacksToday: [],
    });

    render(<OverviewTab />);

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("130")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    // Only onlineUsers is still null ("—"); pendingReports now shows a count.
    expect(screen.getAllByText("—")).toHaveLength(1);
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
