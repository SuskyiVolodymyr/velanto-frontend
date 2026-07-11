import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VoteButtons } from "./VoteButtons";
import { packsClient } from "@/src/shared/lib/packs-client";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/auth-context");

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/packs/pack-1",
}));

const mockedPacksClient = vi.mocked(packsClient);
const mockedUseAuth = vi.mocked(useAuth);

function mockAuth(authenticated: boolean) {
  mockedUseAuth.mockReturnValue({
    user: authenticated
      ? {
          id: "u1",
          email: "a@x.com",
          username: "a",
          role: "user",
          createdAt: "",
        }
      : null,
    status: authenticated ? "authenticated" : "unauthenticated",
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

describe("VoteButtons", () => {
  beforeEach(() => vi.resetAllMocks());

  it("renders the net score (likes − dislikes) from the initial props", () => {
    mockAuth(true);
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={3}
        initialDislikes={1}
        initialMyVote={null}
      />,
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("clicking Upvote calls packsClient.vote with value 1 and updates the score", async () => {
    mockAuth(true);
    mockedPacksClient.vote.mockResolvedValue({
      score: 1,
      likes: 1,
      dislikes: 0,
      myVote: 1,
    });
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Upvote" }));
    expect(mockedPacksClient.vote).toHaveBeenCalledWith("pack-1", 1);
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
  });

  it("clicking Downvote calls packsClient.vote with value -1 and updates the score", async () => {
    mockAuth(true);
    mockedPacksClient.vote.mockResolvedValue({
      score: -1,
      likes: 0,
      dislikes: 1,
      myVote: -1,
    });
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Downvote" }));
    expect(mockedPacksClient.vote).toHaveBeenCalledWith("pack-1", -1);
    await waitFor(() => expect(screen.getByText("-1")).toBeInTheDocument());
  });

  it("clicking the currently-active Upvote again toggles it off (still calls vote with value 1)", async () => {
    mockAuth(true);
    mockedPacksClient.vote.mockResolvedValue({
      score: 0,
      likes: 0,
      dislikes: 0,
      myVote: null,
    });
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={1}
        initialDislikes={0}
        initialMyVote={1}
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Upvote" }));
    expect(mockedPacksClient.vote).toHaveBeenCalledWith("pack-1", 1);
    await waitFor(() => expect(screen.getByText("0")).toBeInTheDocument());
  });

  it("blocks an anonymous viewer with a reason tooltip instead of voting or redirecting", async () => {
    mockAuth(false);
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    const upvote = screen.getByRole("button", { name: "Upvote" });
    expect(upvote).toHaveAttribute("aria-disabled", "true");

    // The reason is discoverable on hover, not fired as a surprise redirect.
    await userEvent.hover(upvote);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Log in to vote");

    await userEvent.click(upvote);
    expect(mockedPacksClient.vote).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows an inline error and does not change the score when the vote call fails", async () => {
    mockAuth(true);
    mockedPacksClient.vote.mockRejectedValue(new Error("network"));
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={2}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Upvote" }));
    await waitFor(() =>
      expect(screen.getByText(/couldn't/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
