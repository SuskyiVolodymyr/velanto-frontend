import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFollowListRowMutation } from "./follow-list.queries";
import { usersClient } from "@/src/shared/lib/users-client";

vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: { follow: vi.fn(), unfollow: vi.fn() },
}));

function withClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe("useFollowListRowMutation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates the target user's author profile query after following", async () => {
    vi.mocked(usersClient.follow).mockResolvedValue({ followerCount: 5 });
    const { queryClient, wrapper } = withClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useFollowListRowMutation(), {
      wrapper,
    });
    result.current.mutate({ userId: "u2", currentlyFollowing: false });

    await waitFor(() => expect(usersClient.follow).toHaveBeenCalledWith("u2"));
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["author", "u2"] }),
    );
  });

  it("also invalidates the author profile after unfollowing", async () => {
    vi.mocked(usersClient.unfollow).mockResolvedValue({ followerCount: 4 });
    const { queryClient, wrapper } = withClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useFollowListRowMutation(), {
      wrapper,
    });
    result.current.mutate({ userId: "u2", currentlyFollowing: true });

    await waitFor(() =>
      expect(usersClient.unfollow).toHaveBeenCalledWith("u2"),
    );
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["author", "u2"] }),
    );
  });

  it("patches isFollowedByMe in the user-search cache after following", async () => {
    vi.mocked(usersClient.follow).mockResolvedValue({ followerCount: 1 });
    const { queryClient, wrapper } = withClient();
    queryClient.setQueryData(["user-search", "ali", 1], {
      items: [
        {
          id: "u2",
          username: "alicia",
          avatarKey: null,
          role: "user",
          trusted: false,
          isFollowedByMe: false,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    const { result } = renderHook(() => useFollowListRowMutation(), {
      wrapper,
    });
    result.current.mutate({ userId: "u2", currentlyFollowing: false });

    await waitFor(() => expect(usersClient.follow).toHaveBeenCalledWith("u2"));
    await waitFor(() => {
      const data = queryClient.getQueryData(["user-search", "ali", 1]) as {
        items: { id: string; isFollowedByMe: boolean | null }[];
      };
      expect(data.items[0].isFollowedByMe).toBe(true);
    });
  });
});
