import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PackChangesRequestedBanner } from "./PackChangesRequestedBanner";
import type { Pack } from "@/src/shared/types/pack";
import type { User } from "@/src/shared/types/user";

let currentUser: User | null;
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ user: currentUser }),
}));

function asUser(id: string): User {
  return {
    id,
    email: null,
    username: "packsmith",
    role: "user",
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

function pack(overrides: Partial<Pack> = {}): Pack {
  return {
    id: "p1",
    title: "Best Anime Openings",
    description: "…",
    coverTone: "#2b2a3a",
    format: "save_one",
    language: "en",
    tags: [],
    groups: [],
    rounds: [],
    authorId: "a1",
    createdAt: "2026-01-01T00:00:00.000Z",
    totalPlays: 0,
    avgAgreementPercent: 0,
    status: "changes_requested",
    rejectionReason: null,
    changeRequest: {
      message: "Two things before this can go live.",
      marks: [
        { kind: "title", id: "", label: "Title", request: "Too vague." },
        { kind: "item", id: "i1", label: "Naruto", request: "Broken link." },
      ],
      requestedById: "mod-1",
      requestedAt: "2026-07-31T10:00:00.000Z",
    },
    score: 0,
    likes: 0,
    dislikes: 0,
    myVote: null,
    ...overrides,
  };
}

beforeEach(() => {
  currentUser = asUser("a1");
});

describe("PackChangesRequestedBanner", () => {
  it("points the author at the outcome page, counting what was marked", () => {
    render(<PackChangesRequestedBanner pack={pack()} />);

    expect(screen.getByText("Changes were requested")).toBeInTheDocument();
    expect(screen.getByText(/2 things marked to fix/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See what to fix" }),
    ).toHaveAttribute("href", "/packs/p1/review");
  });

  // A request can be a message with nothing marked — the whole pack can be the
  // problem — and the banner must still make sense.
  it("still invites the author in when nothing was marked", () => {
    render(
      <PackChangesRequestedBanner
        pack={pack({
          changeRequest: {
            message: "Rewrite the description.",
            marks: [],
            requestedById: "mod-1",
            requestedAt: "2026-07-31T10:00:00.000Z",
          },
        })}
      />,
    );

    expect(
      screen.getByText("Read what the moderator asked before you edit."),
    ).toBeInTheDocument();
  });

  // Only the author can act on it — and only the author and staff can even see
  // the pack in this state.
  it("renders nothing for anyone but the author", () => {
    currentUser = asUser("someone-else");
    const { container } = render(<PackChangesRequestedBanner pack={pack()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a signed-out visitor", () => {
    currentUser = null;
    const { container } = render(<PackChangesRequestedBanner pack={pack()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing on a pack in any other state", () => {
    const { container } = render(
      <PackChangesRequestedBanner
        pack={pack({ status: "pending", changeRequest: null })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
