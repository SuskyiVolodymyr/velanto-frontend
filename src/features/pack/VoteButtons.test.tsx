import { render, screen, waitFor, within } from "@testing-library/react";
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

  it("renders like/dislike counts from the initial props", () => {
    mockAuth(true);
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={3}
        initialDislikes={1}
        initialMyVote={null}
      />,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("clicking Like calls packsClient.vote with value 1 and updates counts from the response", async () => {
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
    await userEvent.click(screen.getByRole("button", { name: /^like/i }));
    expect(mockedPacksClient.vote).toHaveBeenCalledWith("pack-1", 1);
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
  });

  it("clicking the currently-active Like button again toggles it off (still calls vote with value 1)", async () => {
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
    // initialDislikes is already 0, so a bare `getByText("0")` would be ambiguous
    // once the Like count also drops to 0 — scope the assertion to the Like
    // button itself to check specifically its own count updated.
    const likeButton = screen.getByRole("button", { name: /^like/i });
    await userEvent.click(likeButton);
    expect(mockedPacksClient.vote).toHaveBeenCalledWith("pack-1", 1);
    await waitFor(() =>
      expect(within(likeButton).getByText("0")).toBeInTheDocument(),
    );
  });

  it("redirects an anonymous viewer to /auth on click instead of calling the API", async () => {
    mockAuth(false);
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^like/i }));
    expect(mockedPacksClient.vote).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/auth?next=%2Fpacks%2Fpack-1");
  });

  it("shows an inline error and does not change counts when the vote call fails", async () => {
    mockAuth(true);
    mockedPacksClient.vote.mockRejectedValue(new Error("network"));
    render(
      <VoteButtons
        packId="pack-1"
        initialLikes={0}
        initialDislikes={0}
        initialMyVote={null}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^like/i }));
    await waitFor(() =>
      expect(screen.getByText(/couldn't/i)).toBeInTheDocument(),
    );
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });
});
