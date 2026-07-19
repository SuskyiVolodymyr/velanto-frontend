import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { PeopleFeed } from "./PeopleFeed";
import { usersClient } from "@/src/shared/lib/users-client";
import type { FollowUser } from "@/src/shared/lib/users-client";

vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: { search: vi.fn() },
}));

// Isolate PeopleFeed from the follow-row's own dependencies (auth, mutation,
// streamer-mode) — a marker that echoes the username is enough here.
vi.mock("@/src/features/author/FollowUserRow", () => ({
  FollowUserRow: ({ user }: { user: FollowUser }) => <div>{user.username}</div>,
}));

function person(username: string): FollowUser {
  return {
    id: username,
    username,
    avatarKey: null,
    role: "user",
    trusted: false,
    isFollowedByMe: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PeopleFeed", () => {
  it("shows a hint and does not search until the query is long enough", async () => {
    render(<PeopleFeed />);

    expect(
      screen.getByText("Type at least 2 characters to search."),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByRole("searchbox"), "a");
    expect(usersClient.search).not.toHaveBeenCalled();
  });

  it("searches (debounced) and lists the matching users", async () => {
    vi.mocked(usersClient.search).mockResolvedValue({
      items: [person("alice"), person("alicia")],
      total: 2,
      page: 1,
      limit: 20,
    });

    render(<PeopleFeed />);
    await userEvent.type(screen.getByRole("searchbox"), "ali");

    expect(await screen.findByText("alice")).toBeInTheDocument();
    expect(screen.getByText("alicia")).toBeInTheDocument();
    expect(usersClient.search).toHaveBeenCalledWith(
      "ali",
      expect.objectContaining({ limit: 20 }),
    );
  });

  it("shows an empty message when nobody matches", async () => {
    vi.mocked(usersClient.search).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    render(<PeopleFeed />);
    await userEvent.type(screen.getByRole("searchbox"), "zzz");

    expect(await screen.findByText("No people found.")).toBeInTheDocument();
  });
});
