import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PackApprovalsTab } from "./PackApprovalsTab";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/packs-client", () => ({
  packsClient: { moderationQueue: vi.fn(), approve: vi.fn(), reject: vi.fn() },
}));

function pack(overrides: Partial<Pack> = {}): Pack {
  return {
    id: "p1",
    title: "Best Anime Openings",
    description: "…",
    coverTone: "violet",
    format: "save_one",
    language: "en",
    tags: ["Anime"],
    groups: [],
    rounds: [],
    authorId: "a1",
    author: {
      id: "a1",
      username: "packsmith",
      avatarKey: null,
      role: "user",
      trusted: false,
    },
    createdAt: "2020-01-01T00:00:00.000Z",
    submittedAt: "2026-07-14T00:00:00.000Z",
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

function queuePage(items: Pack[], total = items.length) {
  return { items, total, page: 1, limit: 20 };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(packsClient.moderationQueue).mockResolvedValue(queuePage([pack()]));
  vi.mocked(packsClient.approve).mockResolvedValue(
    pack({ status: "approved" }),
  );
  vi.mocked(packsClient.reject).mockResolvedValue(pack({ status: "rejected" }));
});

describe("PackApprovalsTab", () => {
  it("requests the oldest submissions first — the backlog, not the newest arrivals", async () => {
    render(<PackApprovalsTab />);

    await screen.findByText("Best Anime Openings");
    expect(packsClient.moderationQueue).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "oldest", page: 1 }),
    );
  });

  it("shows the author and the submission date, not the creation date", async () => {
    render(<PackApprovalsTab />);

    await screen.findByText("Best Anime Openings");
    expect(screen.getByText("packsmith")).toBeInTheDocument();
    // createdAt is 2020 and submittedAt is 2026: a pack edited today re-enters
    // the queue, and the column has to agree with the order it is sorted in.
    expect(
      screen.queryByText(/5 years ago|6 years ago/),
    ).not.toBeInTheDocument();
  });

  it("flips to newest-first on the sort toggle", async () => {
    const user = userEvent.setup();
    render(<PackApprovalsTab />);

    await user.click(await screen.findByRole("button", { name: /Sort:/ }));

    await vi.waitFor(() =>
      expect(packsClient.moderationQueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: "newest" }),
      ),
    );
  });

  it("narrows the queue by format", async () => {
    const user = userEvent.setup();
    render(<PackApprovalsTab />);

    await user.selectOptions(
      await screen.findByLabelText("Filter by format"),
      "nxn",
    );

    await vi.waitFor(() =>
      expect(packsClient.moderationQueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ format: "nxn" }),
      ),
    );
  });

  it("approves a pack and refetches the queue without it", async () => {
    const user = userEvent.setup();
    render(<PackApprovalsTab />);

    await screen.findByText("Best Anime Openings");
    vi.mocked(packsClient.moderationQueue).mockResolvedValue(queuePage([]));
    await user.click(screen.getByRole("button", { name: "Approve" }));

    expect(packsClient.approve).toHaveBeenCalledWith("p1");
    expect(
      await screen.findByText("No packs waiting for review."),
    ).toBeInTheDocument();
  });

  // The API requires a reason, so the button must not be able to send an empty
  // one — a rejected author is owed an explanation.
  it("will not submit a rejection without a reason", async () => {
    const user = userEvent.setup();
    render(<PackApprovalsTab />);

    await screen.findByText("Best Anime Openings");
    await user.click(screen.getByRole("button", { name: "Reject" }));

    const confirm = screen.getByRole("button", { name: "Confirm reject" });
    expect(confirm).toBeDisabled();

    await user.type(
      screen.getByLabelText("Rejection reason for Best Anime Openings"),
      "  ",
    );
    expect(confirm).toBeDisabled();
  });

  it("rejects a pack with the typed reason", async () => {
    const user = userEvent.setup();
    render(<PackApprovalsTab />);

    await screen.findByText("Best Anime Openings");
    await user.click(screen.getByRole("button", { name: "Reject" }));
    await user.type(
      screen.getByLabelText("Rejection reason for Best Anime Openings"),
      "Low effort",
    );
    await user.click(screen.getByRole("button", { name: "Confirm reject" }));

    expect(packsClient.reject).toHaveBeenCalledWith("p1", "Low effort");
  });

  it("surfaces a failed action instead of silently doing nothing", async () => {
    vi.mocked(packsClient.approve).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<PackApprovalsTab />);

    await screen.findByText("Best Anime Openings");
    await user.click(screen.getByRole("button", { name: "Approve" }));

    expect(
      await screen.findByText("Couldn't update this pack. Try again."),
    ).toBeInTheDocument();
  });

  it("pages through the queue", async () => {
    vi.mocked(packsClient.moderationQueue).mockResolvedValue(
      queuePage([pack()], 40),
    );
    const user = userEvent.setup();
    render(<PackApprovalsTab />);

    await screen.findByText("Best Anime Openings");
    await user.click(screen.getByRole("button", { name: "Next" }));

    await vi.waitFor(() =>
      expect(packsClient.moderationQueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
  });

  it("renders an em dash for a pack whose author could not be resolved", async () => {
    vi.mocked(packsClient.moderationQueue).mockResolvedValue(
      queuePage([pack({ author: undefined })]),
    );
    render(<PackApprovalsTab />);

    const row = await screen.findByText("Best Anime Openings");
    expect(
      within(row.closest('[role="row"]') as HTMLElement).getByText("—"),
    ).toBeInTheDocument();
  });
});
