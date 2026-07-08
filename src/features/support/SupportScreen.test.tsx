import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupportScreen } from "./SupportScreen";
import { reportsClient } from "@/src/shared/lib/reports-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { Role } from "@/src/shared/types/user";

vi.mock("@/src/shared/lib/reports-client");
vi.mock("@/src/shared/lib/auth-context");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/support",
}));

const mockedReportsClient = vi.mocked(reportsClient);
const mockedUseAuth = vi.mocked(useAuth);

const report = {
  id: "r1",
  type: "pack" as const,
  reason: "spam",
  comment: null,
  targetId: "pack-1",
  roundIndex: null,
  reporterId: "u1",
  reporterUsername: "reporter1",
  status: "new" as const,
  reviewedById: null,
  closedById: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function mockAuth(role: Role | null) {
  mockedUseAuth.mockReturnValue({
    user: role ? { id: "mod-1", email: "m@x.com", username: "mod", role, createdAt: "" } : null,
    status: role ? "authenticated" : "unauthenticated",
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

describe("SupportScreen", () => {
  beforeEach(() => vi.resetAllMocks());

  it("shows a log-in prompt for an unauthenticated viewer", async () => {
    mockAuth(null);
    render(<SupportScreen />);
    await waitFor(() => expect(screen.getByText(/need to be logged in/i)).toBeInTheDocument());
  });

  it("renders nothing for a plain-user viewer (redirect path)", async () => {
    mockAuth("user");
    const { container } = render(<SupportScreen />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it("renders the report queue for a moderator viewer", async () => {
    mockAuth("moderator");
    mockedReportsClient.list.mockResolvedValue({ items: [report], total: 1, page: 1, limit: 20 });
    render(<SupportScreen />);
    await waitFor(() => expect(screen.getByText("reporter1")).toBeInTheDocument());
    expect(screen.getByText("Spam or misleading")).toBeInTheDocument();
  });

  it("filters by status when a status chip is clicked", async () => {
    mockAuth("moderator");
    mockedReportsClient.list.mockResolvedValue({ items: [report], total: 1, page: 1, limit: 20 });
    render(<SupportScreen />);
    await waitFor(() => expect(screen.getByText("reporter1")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "New" }));
    await waitFor(() =>
      expect(mockedReportsClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "new", page: 1 }),
      ),
    );
  });

  it("filters by type when a type chip is clicked", async () => {
    mockAuth("moderator");
    mockedReportsClient.list.mockResolvedValue({ items: [report], total: 1, page: 1, limit: 20 });
    render(<SupportScreen />);
    await waitFor(() => expect(screen.getByText("reporter1")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Users" }));
    await waitFor(() =>
      expect(mockedReportsClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "user", page: 1 }),
      ),
    );
  });

  it("loads more results and appends without duplicates", async () => {
    mockAuth("moderator");
    mockedReportsClient.list
      .mockResolvedValueOnce({ items: [report], total: 2, page: 1, limit: 1 })
      .mockResolvedValueOnce({
        items: [{ ...report, id: "r2", reporterUsername: "reporter2" }],
        total: 2,
        page: 2,
        limit: 1,
      });
    render(<SupportScreen />);
    await waitFor(() => expect(screen.getByText("reporter1")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() => expect(screen.getByText("reporter2")).toBeInTheDocument());
    expect(screen.getByText("reporter1")).toBeInTheDocument();
  });

  it("shows an empty-state message when no reports match", async () => {
    mockAuth("moderator");
    mockedReportsClient.list.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    render(<SupportScreen />);
    await waitFor(() => expect(screen.getByText(/no reports match/i)).toBeInTheDocument());
  });
});
