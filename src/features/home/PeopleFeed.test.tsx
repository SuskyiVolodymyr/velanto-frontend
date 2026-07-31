import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { PeopleFeed } from "./PeopleFeed";
import { usersClient } from "@/src/shared/lib/users-client";
import type { FollowUser } from "@/src/shared/lib/users-client";

vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: { search: vi.fn() },
}));

// Isolate PeopleFeed from the card's own dependencies (auth, follow mutation,
// streamer-mode) — a marker that echoes the username is enough here.
vi.mock("@/src/features/home/PersonCard", () => ({
  PersonCard: ({ user }: { user: FollowUser }) => <div>{user.username}</div>,
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

function mockPage(items: FollowUser[]) {
  vi.mocked(usersClient.search).mockResolvedValue({
    items,
    total: items.length,
    page: 1,
    limit: 20,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PeopleFeed", () => {
  // The directory opens on everyone rather than on a "type at least 2
  // characters" hint — an empty query is the real request now, not a doomed
  // one to suppress.
  it("lists the directory on mount, with no query", async () => {
    mockPage([person("alice"), person("bob")]);

    render(<PeopleFeed />);

    expect(await screen.findByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(usersClient.search).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ limit: 20 }),
    );
  });

  // These wait on the CALL, not on rendered names: the mount already fetched
  // the directory with the same stub, so the rows are on screen before the
  // debounce has flushed and `findByText` would resolve against them.
  it("searches on a single character rather than waiting for two", async () => {
    mockPage([person("alice")]);

    render(<PeopleFeed />);
    await userEvent.type(screen.getByRole("searchbox"), "a");

    await waitFor(() =>
      expect(usersClient.search).toHaveBeenCalledWith(
        "a",
        expect.objectContaining({ limit: 20 }),
      ),
    );
  });

  it("searches (debounced) and lists the matching users", async () => {
    mockPage([person("alice"), person("alicia")]);

    render(<PeopleFeed />);
    await userEvent.type(screen.getByRole("searchbox"), "ali");

    await waitFor(() =>
      expect(usersClient.search).toHaveBeenCalledWith(
        "ali",
        expect.objectContaining({ limit: 20 }),
      ),
    );
    expect(await screen.findByText("alice")).toBeInTheDocument();
    expect(screen.getByText("alicia")).toBeInTheDocument();
    // One request per settled query, not one per keystroke.
    expect(usersClient.search).toHaveBeenCalledTimes(2);
  });

  it("shows an empty message when nobody matches", async () => {
    mockPage([]);

    render(<PeopleFeed />);
    await userEvent.type(screen.getByRole("searchbox"), "zzz");

    expect(await screen.findByText("No people found.")).toBeInTheDocument();
  });
});
