import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeedbackScreen } from "./FeedbackScreen";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { Feedback } from "@/src/shared/types/feedback";

vi.mock("@/src/shared/lib/feedback-client");
vi.mock("@/src/shared/lib/auth-context");

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/feedback",
}));

const mockedFeedbackClient = vi.mocked(feedbackClient);
const mockedUseAuth = vi.mocked(useAuth);

function makePost(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: "f1",
    topic: "bug",
    title: "A bug report",
    body: "body",
    visibility: "everyone",
    status: "new",
    authorId: "u1",
    authorUsername: "alice",
    handledById: null,
    locale: null,
    translationContext: null,
    translationSuggestion: null,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
    score: 5,
    likes: 5,
    dislikes: 0,
    myVote: null,
    commentCount: 2,
    ...overrides,
  };
}

function mockAuth(authenticated: boolean) {
  mockedUseAuth.mockReturnValue({
    user: authenticated
      ? {
          id: "u1",
          email: "a@x.com",
          username: "alice",
          role: "user",
          createdAt: "",
        }
      : null,
    status: authenticated ? "authenticated" : "unauthenticated",
    login: vi.fn(),
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setAvatarKey: vi.fn(),
    patchUser: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

function mockList(items: Feedback[], total = items.length) {
  mockedFeedbackClient.list.mockResolvedValue({
    items,
    total,
    page: 1,
    limit: 20,
  });
}

describe("FeedbackScreen", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth(true);
  });

  it("fetches the main list and the Top-3 sidebar on mount and renders titles", async () => {
    mockedFeedbackClient.list.mockImplementation((filters = {}) => {
      const isSidebar = filters.sort === "top" && filters.limit === 3;
      const post = isSidebar
        ? makePost({ id: "s1", title: "Sidebar top post" })
        : makePost({ id: "f1", title: "Main list post" });
      return Promise.resolve({ items: [post], total: 1, page: 1, limit: 20 });
    });
    render(<FeedbackScreen />);

    await waitFor(() =>
      expect(screen.getByText("Main list post")).toBeInTheDocument(),
    );
    expect(screen.getByText("Sidebar top post")).toBeInTheDocument();

    // Main list call: page 1, limit 20.
    expect(mockedFeedbackClient.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20, sort: "new" }),
    );
    // Sidebar call: sort top, limit 3.
    expect(mockedFeedbackClient.list).toHaveBeenCalledWith({
      sort: "top",
      limit: 3,
    });
  });

  it("debounced search feeds a `q` into the list call", async () => {
    mockList([makePost()]);
    render(<FeedbackScreen />);
    await waitFor(() => expect(mockedFeedbackClient.list).toHaveBeenCalled());

    await userEvent.type(screen.getByRole("searchbox"), "crash");

    await waitFor(() =>
      expect(mockedFeedbackClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ q: "crash" }),
      ),
    );
  });

  it("clicking a topic chip filters by topic", async () => {
    mockList([makePost()]);
    render(<FeedbackScreen />);
    await waitFor(() => expect(mockedFeedbackClient.list).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Feature" }));

    await waitFor(() =>
      expect(mockedFeedbackClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ topic: "feature" }),
      ),
    );
  });

  it("clicking a status chip filters by status", async () => {
    mockList([makePost()]);
    render(<FeedbackScreen />);
    await waitFor(() => expect(mockedFeedbackClient.list).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "In progress" }));

    await waitFor(() =>
      expect(mockedFeedbackClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: "in_progress" }),
      ),
    );
  });

  it("toggling sort to Top changes the sort in the list call", async () => {
    mockList([makePost()]);
    render(<FeedbackScreen />);
    await waitFor(() => expect(mockedFeedbackClient.list).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Top" }));

    await waitFor(() =>
      expect(mockedFeedbackClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "top", page: 1, limit: 20 }),
      ),
    );
  });

  it("shows a loading state instead of the stale list while a filter change refetches", async () => {
    let resolveRefetch: (value: {
      items: Feedback[];
      total: number;
      page: number;
      limit: number;
    }) => void = () => {};
    let mainCall = 0;
    mockedFeedbackClient.list.mockImplementation((filters = {}) => {
      if (filters.sort === "top" && filters.limit === 3) {
        return Promise.resolve({ items: [], total: 0, page: 1, limit: 3 });
      }
      mainCall += 1;
      if (mainCall === 1) {
        return Promise.resolve({
          items: [makePost({ id: "f1", title: "First list post" })],
          total: 1,
          page: 1,
          limit: 20,
        });
      }
      return new Promise((resolve) => {
        resolveRefetch = resolve;
      });
    });
    render(<FeedbackScreen />);
    await waitFor(() =>
      expect(screen.getByText("First list post")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Feature" }));

    // While the refetch is in flight, the stale row is gone and a loading state shows.
    await waitFor(() =>
      expect(screen.getByText(/loading feedback/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText("First list post")).not.toBeInTheDocument();

    resolveRefetch({
      items: [makePost({ id: "f2", title: "Filtered post" })],
      total: 1,
      page: 1,
      limit: 20,
    });
    await waitFor(() =>
      expect(screen.getByText("Filtered post")).toBeInTheDocument(),
    );
  });

  it("clears a stale load-more error when the filter changes", async () => {
    mockedFeedbackClient.list.mockImplementation((filters = {}) => {
      if (filters.sort === "top" && filters.limit === 3) {
        return Promise.resolve({ items: [], total: 0, page: 1, limit: 3 });
      }
      if (filters.page === 2) return Promise.reject(new Error("network"));
      return Promise.resolve({
        items: [makePost({ id: "f1", title: "Row" })],
        total: 2,
        page: 1,
        limit: 20,
      });
    });
    render(<FeedbackScreen />);
    await waitFor(() => expect(screen.getByText("Row")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/couldn't load more feedback/i),
      ).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Feature" }));
    await waitFor(() =>
      expect(
        screen.queryByText(/couldn't load more feedback/i),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows an empty message when there are no items", async () => {
    mockList([]);
    render(<FeedbackScreen />);
    await waitFor(() =>
      expect(screen.getByText(/no feedback matches/i)).toBeInTheDocument(),
    );
  });

  it("shows an error message when the list call rejects", async () => {
    mockedFeedbackClient.list.mockRejectedValue(new Error("network"));
    render(<FeedbackScreen />);
    await waitFor(() =>
      expect(screen.getByText(/couldn't load feedback/i)).toBeInTheDocument(),
    );
  });

  it("routes an authenticated user to /feedback/new when clicking New post", async () => {
    mockAuth(true);
    mockList([makePost()]);
    render(<FeedbackScreen />);
    await waitFor(() => expect(mockedFeedbackClient.list).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: /new post/i }));
    expect(push).toHaveBeenCalledWith("/feedback/new");
  });

  it("routes an anonymous user to /auth when clicking New post", async () => {
    mockAuth(false);
    mockList([makePost()]);
    render(<FeedbackScreen />);
    await waitFor(() => expect(mockedFeedbackClient.list).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: /new post/i }));
    expect(push).toHaveBeenCalledWith("/auth?next=/feedback");
  });
});
