import type { ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";
import messages from "@/messages/en.json";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
import { PackReviewScreen } from "./PackReviewScreen";
import { packsClient } from "@/src/shared/lib/packs-client";
import { usersClient } from "@/src/shared/lib/users-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { Pack } from "@/src/shared/types/pack";
import type { PublicUserProfile } from "@/src/shared/types/user";

vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/users-client");
vi.mock("@/src/shared/lib/auth-context");

const { mockPush, mockReplace } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/moderation/packs/p1",
}));

const mockedPacksClient = vi.mocked(packsClient);
const mockedUsersClient = vi.mocked(usersClient);
const mockedUseAuth = vi.mocked(useAuth);

function pack(overrides: Partial<Pack> = {}): Pack {
  return {
    id: "p1",
    title: "Best Anime Openings",
    description: "A ranking of the best anime openings of all time.",
    coverTone: "#2b2a3a",
    format: "save_one",
    language: "en",
    tags: ["Anime", "Music"],
    groups: [
      {
        id: "g1",
        name: "Openings",
        items: [
          {
            id: "i1",
            type: "text",
            title: "Guren no Yumiya",
            value: "Guren no Yumiya",
          },
        ],
      },
    ],
    rounds: [
      {
        id: "r1",
        name: "",
        slots: [{ groupId: "g1", mode: "manual", itemIds: ["i1"] }],
      },
    ],
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

function authorProfile(
  overrides: Partial<PublicUserProfile> = {},
): PublicUserProfile {
  return {
    id: "a1",
    username: "packsmith",
    bio: null,
    createdAt: "2019-01-01T00:00:00.000Z",
    followerCount: 42,
    followingCount: 3,
    isFollowedByMe: null,
    role: "user",
    trusted: false,
    avatarKey: null,
    ...overrides,
  };
}

function mockAuth(
  role: "moderator" | "manager" | "admin" | "user" = "moderator",
) {
  mockedUseAuth.mockReturnValue({
    user: {
      id: "mod-1",
      email: "m@x.com",
      username: "mod",
      role,
      createdAt: "",
    },
    status: "authenticated",
    login: vi.fn(),
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setAvatarKey: vi.fn(),
    patchUser: vi.fn(),
    revalidate: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

function renderScreen(ui: ReactElement) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mockedPacksClient.getById.mockResolvedValue(pack());
  mockedPacksClient.approve.mockResolvedValue(pack({ status: "approved" }));
  mockedPacksClient.reject.mockResolvedValue(pack({ status: "rejected" }));
  mockedPacksClient.requestChanges.mockResolvedValue(
    pack({ status: "changes_requested" }),
  );
  mockedPacksClient.list.mockResolvedValue({
    items: [],
    total: 7,
    page: 1,
    limit: 1,
  });
  mockedUsersClient.getProfile.mockResolvedValue(authorProfile());
});

describe("PackReviewScreen", () => {
  it("redirects a signed-in viewer without moderator+ access", async () => {
    mockAuth("user");
    renderScreen(<PackReviewScreen packId="p1" />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("Best Anime Openings")).not.toBeInTheDocument();
  });

  it("renders for a moderator, manager, and admin viewer", async () => {
    for (const role of ["moderator", "manager", "admin"] as const) {
      mockAuth(role);
      const { unmount } = renderScreen(<PackReviewScreen packId="p1" />);
      await screen.findByRole("heading", {
        name: "Approval review — every item in the pack",
      });
      unmount();
    }
  });

  it("shows a not-found message when the pack doesn't exist", async () => {
    mockAuth();
    mockedPacksClient.getById.mockRejectedValue(new Error("404"));
    renderScreen(<PackReviewScreen packId="missing" />);

    await waitFor(() =>
      expect(screen.getByText(/doesn't exist/i)).toBeInTheDocument(),
    );
  });

  it("renders the pack summary: title, author, format, language, tags, description", async () => {
    mockAuth();
    renderScreen(<PackReviewScreen packId="p1" />);

    await screen.findByRole("heading", {
      name: "Approval review — every item in the pack",
    });
    expect(
      screen.getAllByText(/A ranking of the best anime openings/)[0],
    ).toBeInTheDocument();
    expect(screen.getAllByText(/packsmith/).length).toBeGreaterThan(0);
    expect(screen.getByText("Save One")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Anime")).toBeInTheDocument();
    expect(screen.getByText("Music")).toBeInTheDocument();
  });

  it("renders the author card with follower and pack-count stats", async () => {
    mockAuth();
    renderScreen(<PackReviewScreen packId="p1" />);

    await screen.findByRole("heading", {
      name: "Approval review — every item in the pack",
    });
    expect(mockedUsersClient.getProfile).toHaveBeenCalledWith("a1");
    expect(await screen.findByText(/42 followers/)).toBeInTheDocument();
    expect(screen.getByText(/7 packs/)).toBeInTheDocument();
  });

  it("renders the full pack contents (no roundIndex) via PackContentsPreview", async () => {
    mockAuth();
    renderScreen(<PackReviewScreen packId="p1" />);

    await screen.findByRole("heading", {
      name: "Approval review — every item in the pack",
    });
    expect(
      screen.getByRole("heading", { name: "Openings" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Guren no Yumiya")).toBeInTheDocument();
  });

  it("renders a round-to-pool mapping list", async () => {
    mockAuth();
    renderScreen(<PackReviewScreen packId="p1" />);

    await screen.findByRole("heading", {
      name: "Approval review — every item in the pack",
    });
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    // The round's slot draws from the "Openings" pool — this must appear a
    // second time in the mapping list, distinct from the contents section's
    // own "Openings" heading.
    expect(screen.getAllByText("Openings").length).toBeGreaterThan(1);
  });

  // Mark-for-edit and Request changes were a deliberate cut when this screen
  // first shipped (D5/D7) and this test asserted their absence. The backend
  // outcome now exists, so the cut is undone and the assertion is inverted.
  describe("request changes", () => {
    it("offers the third outcome, and marks anything in the pack for edit", async () => {
      mockAuth();
      const user = userEvent.setup();
      renderScreen(<PackReviewScreen packId="p1" />);
      await screen.findByRole("heading", {
        name: "Approval review — every item in the pack",
      });

      expect(
        screen.getByRole("button", { name: "Request changes" }),
      ).toBeInTheDocument();
      // One per markable pack field (title/description/cover/tags), plus one
      // per item and one per round.
      expect(
        screen.getAllByRole("button", { name: "Mark for edit" }).length,
      ).toBeGreaterThan(4);

      await user.click(
        screen.getAllByRole("button", { name: "Mark for edit" })[0],
      );
      expect(
        screen.getByRole("button", { name: "Marked" }),
      ).toBeInTheDocument();
    });

    it("sends the message and the marks the moderator made", async () => {
      mockAuth();
      const user = userEvent.setup();
      renderScreen(<PackReviewScreen packId="p1" />);
      await screen.findByRole("heading", {
        name: "Approval review — every item in the pack",
      });

      // Mark the title, then describe what is wrong with it.
      await user.click(
        screen.getAllByRole("button", { name: "Mark for edit" })[0],
      );
      await user.type(
        screen.getByLabelText("What should the author write instead?"),
        "Too vague",
      );

      await user.click(screen.getByRole("button", { name: "Request changes" }));
      await user.type(
        screen.getByPlaceholderText(
          "What has to change before this can go live?",
        ),
        "One fix and this is good to go.",
      );
      await user.click(screen.getByRole("button", { name: "Send request" }));

      expect(mockedPacksClient.requestChanges).toHaveBeenCalledWith("p1", {
        message: "One fix and this is good to go.",
        marks: [
          { kind: "title", id: "", label: "Title", request: "Too vague" },
        ],
      });
      await waitFor(() =>
        expect(mockPush).toHaveBeenCalledWith("/moderation?tab=packs"),
      );
    });

    // The backend requires a message too, so an empty one can only fail.
    it("will not send a request with no message", async () => {
      mockAuth();
      const user = userEvent.setup();
      renderScreen(<PackReviewScreen packId="p1" />);
      await screen.findByRole("heading", {
        name: "Approval review — every item in the pack",
      });

      await user.click(screen.getByRole("button", { name: "Request changes" }));

      expect(
        screen.getByRole("button", { name: "Send request" }),
      ).toBeDisabled();
      expect(mockedPacksClient.requestChanges).not.toHaveBeenCalled();
    });
  });

  it("approves the pack and returns to the pack-approvals queue", async () => {
    mockAuth();
    const user = userEvent.setup();
    renderScreen(<PackReviewScreen packId="p1" />);

    await screen.findByRole("heading", {
      name: "Approval review — every item in the pack",
    });
    await user.click(screen.getByRole("button", { name: "Approve pack" }));

    expect(mockedPacksClient.approve).toHaveBeenCalledWith("p1");
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/moderation?tab=packs"),
    );
  });

  it("will not submit a rejection without a reason", async () => {
    mockAuth();
    const user = userEvent.setup();
    renderScreen(<PackReviewScreen packId="p1" />);

    await screen.findByRole("heading", {
      name: "Approval review — every item in the pack",
    });
    await user.click(screen.getByRole("button", { name: "Reject pack" }));

    const confirm = screen.getByRole("button", { name: "Confirm reject" });
    expect(confirm).toBeDisabled();
  });

  it("rejects the pack with the typed reason and returns to the queue", async () => {
    mockAuth();
    const user = userEvent.setup();
    renderScreen(<PackReviewScreen packId="p1" />);

    await screen.findByRole("heading", {
      name: "Approval review — every item in the pack",
    });
    await user.click(screen.getByRole("button", { name: "Reject pack" }));
    await user.type(
      screen.getByLabelText("Rejection reason for Best Anime Openings"),
      "Low effort",
    );
    await user.click(screen.getByRole("button", { name: "Confirm reject" }));

    expect(mockedPacksClient.reject).toHaveBeenCalledWith("p1", "Low effort");
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/moderation?tab=packs"),
    );
  });

  it("surfaces a failed approve instead of silently doing nothing, and does not navigate away", async () => {
    mockAuth();
    mockedPacksClient.approve.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderScreen(<PackReviewScreen packId="p1" />);

    await screen.findByRole("heading", {
      name: "Approval review — every item in the pack",
    });
    await user.click(screen.getByRole("button", { name: "Approve pack" }));

    expect(
      await screen.findByText("Couldn't update this pack. Try again."),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
