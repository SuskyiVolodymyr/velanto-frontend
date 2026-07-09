// src/features/admin/OverviewTab.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { OverviewTab } from "./OverviewTab";
import { adminClient } from "@/src/shared/lib/admin-client";

vi.mock("@/src/shared/lib/admin-client", () => ({
  adminClient: { overview: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
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
    vi.mocked(adminClient.overview).mockRejectedValue(new Error("network error"));
    render(<OverviewTab />);
    expect(await screen.findByText(/Couldn't load overview/)).toBeInTheDocument();
  });
});
