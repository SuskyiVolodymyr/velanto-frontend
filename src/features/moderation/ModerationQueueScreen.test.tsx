import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModerationQueueScreen } from "./ModerationQueueScreen";
import { packsClient } from "@/src/shared/lib/packs-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { Role } from "@/src/shared/types/user";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/auth-context");

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  usePathname: () => "/moderation",
}));

const mockedPacksClient = vi.mocked(packsClient);
const mockedUseAuth = vi.mocked(useAuth);

function makePack(overrides: Partial<Pack> = {}): Pack {
  return {
    id: "p1",
    title: "Best Pack",
    description: "A great pack awaiting review",
    coverTone: "#2b2a3a",
    format: "save_one",
    tags: [],
    groups: [],
    rounds: [{ id: "r1", slots: [{ groupId: "g1", mode: "manual" }] }],
    authorId: "u1",
    createdAt: "2026-01-01T00:00:00.000Z",
    totalPlays: 0,
    avgAgreementPercent: 0,
    status: "pending",
    rejectionReason: null,
    score: 0,
    likes: 0,
    dislikes: 0,
    myVote: null,
    ...overrides,
  };
}

function mockAuth(role: Role | null) {
  mockedUseAuth.mockReturnValue({
    user: role
      ? { id: "mod-1", email: "m@x.com", username: "mod", role, createdAt: "" }
      : null,
    status: role ? "authenticated" : "unauthenticated",
    login: vi.fn(),
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

describe("ModerationQueueScreen", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects to / when authenticated but role is not moderator+", async () => {
    mockAuth("user");
    render(<ModerationQueueScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("renders a login prompt when unauthenticated", async () => {
    mockAuth(null);
    render(<ModerationQueueScreen />);
    await waitFor(() =>
      expect(screen.getByText(/need to be logged in/i)).toBeInTheDocument(),
    );
  });

  it("renders the queue list for a moderator user, showing title and format", async () => {
    mockAuth("moderator");
    mockedPacksClient.moderationQueue.mockResolvedValue({
      items: [makePack()],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<ModerationQueueScreen />);
    await waitFor(() =>
      expect(screen.getByText("Best Pack")).toBeInTheDocument(),
    );
    expect(screen.getByText("Save One")).toBeInTheDocument();
  });

  it("renders the queue list for a manager user", async () => {
    mockAuth("manager");
    mockedPacksClient.moderationQueue.mockResolvedValue({
      items: [makePack()],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<ModerationQueueScreen />);
    await waitFor(() =>
      expect(screen.getByText("Best Pack")).toBeInTheDocument(),
    );
  });

  it("renders the queue list for an admin user", async () => {
    mockAuth("admin");
    mockedPacksClient.moderationQueue.mockResolvedValue({
      items: [makePack()],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<ModerationQueueScreen />);
    await waitFor(() =>
      expect(screen.getByText("Best Pack")).toBeInTheDocument(),
    );
  });

  it("shows the empty state when the queue is empty", async () => {
    mockAuth("moderator");
    mockedPacksClient.moderationQueue.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    render(<ModerationQueueScreen />);
    await waitFor(() =>
      expect(
        screen.getByText("No packs waiting for review."),
      ).toBeInTheDocument(),
    );
  });

  it("shows an error message when the initial queue fetch fails", async () => {
    mockAuth("moderator");
    mockedPacksClient.moderationQueue.mockRejectedValue(new Error("network"));
    render(<ModerationQueueScreen />);
    await waitFor(() =>
      expect(screen.getByText(/couldn't load packs/i)).toBeInTheDocument(),
    );
  });

  it("approves a pack and removes it from the list on success", async () => {
    mockAuth("moderator");
    mockedPacksClient.moderationQueue.mockResolvedValue({
      items: [makePack()],
      total: 1,
      page: 1,
      limit: 20,
    });
    mockedPacksClient.approve.mockResolvedValue(
      makePack({ status: "approved" }),
    );
    render(<ModerationQueueScreen />);
    await waitFor(() =>
      expect(screen.getByText("Best Pack")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(mockedPacksClient.approve).toHaveBeenCalledWith("p1");
    await waitFor(() =>
      expect(screen.queryByText("Best Pack")).not.toBeInTheDocument(),
    );
  });

  it("rejects a pack with a typed reason and removes it from the list on success", async () => {
    mockAuth("moderator");
    mockedPacksClient.moderationQueue.mockResolvedValue({
      items: [makePack()],
      total: 1,
      page: 1,
      limit: 20,
    });
    mockedPacksClient.reject.mockResolvedValue(
      makePack({ status: "rejected" }),
    );
    render(<ModerationQueueScreen />);
    await waitFor(() =>
      expect(screen.getByText("Best Pack")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    const textarea = await screen.findByLabelText("Rejection reason");
    await userEvent.type(textarea, "Duplicate of an existing pack");
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm reject" }),
    );
    expect(mockedPacksClient.reject).toHaveBeenCalledWith(
      "p1",
      "Duplicate of an existing pack",
    );
    await waitFor(() =>
      expect(screen.queryByText("Best Pack")).not.toBeInTheDocument(),
    );
  });

  it("rejects a pack with an empty reason as undefined", async () => {
    mockAuth("moderator");
    mockedPacksClient.moderationQueue.mockResolvedValue({
      items: [makePack()],
      total: 1,
      page: 1,
      limit: 20,
    });
    mockedPacksClient.reject.mockResolvedValue(
      makePack({ status: "rejected" }),
    );
    render(<ModerationQueueScreen />);
    await waitFor(() =>
      expect(screen.getByText("Best Pack")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    await screen.findByLabelText("Rejection reason");
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm reject" }),
    );
    expect(mockedPacksClient.reject).toHaveBeenCalledWith("p1", undefined);
    await waitFor(() =>
      expect(screen.queryByText("Best Pack")).not.toBeInTheDocument(),
    );
  });

  it("shows a per-row error and keeps the row when approve fails", async () => {
    mockAuth("moderator");
    mockedPacksClient.moderationQueue.mockResolvedValue({
      items: [makePack()],
      total: 1,
      page: 1,
      limit: 20,
    });
    mockedPacksClient.approve.mockRejectedValue(new Error("network"));
    render(<ModerationQueueScreen />);
    await waitFor(() =>
      expect(screen.getByText("Best Pack")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(
        screen.getByText(/couldn't approve this pack/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Best Pack")).toBeInTheDocument();
  });

  it("shows a per-row error and keeps the row when reject fails", async () => {
    mockAuth("moderator");
    mockedPacksClient.moderationQueue.mockResolvedValue({
      items: [makePack()],
      total: 1,
      page: 1,
      limit: 20,
    });
    mockedPacksClient.reject.mockRejectedValue(new Error("network"));
    render(<ModerationQueueScreen />);
    await waitFor(() =>
      expect(screen.getByText("Best Pack")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    await screen.findByLabelText("Rejection reason");
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm reject" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(/couldn't reject this pack/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Best Pack")).toBeInTheDocument();
  });

  it("loads more results and appends without duplicates", async () => {
    mockAuth("moderator");
    mockedPacksClient.moderationQueue
      .mockResolvedValueOnce({
        items: [makePack()],
        total: 2,
        page: 1,
        limit: 1,
      })
      .mockResolvedValueOnce({
        items: [makePack({ id: "p2", title: "Second Pack" })],
        total: 2,
        page: 2,
        limit: 1,
      });
    render(<ModerationQueueScreen />);
    await waitFor(() =>
      expect(screen.getByText("Best Pack")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() =>
      expect(screen.getByText("Second Pack")).toBeInTheDocument(),
    );
    expect(screen.getByText("Best Pack")).toBeInTheDocument();
    expect(mockedPacksClient.moderationQueue).toHaveBeenLastCalledWith({
      page: 2,
      limit: 20,
    });
  });
});
