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
    revalidate: vi.fn(),
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

  it("topic chip, status chip, and sort toggle each feed the list call", async () => {
    mockList([makePost()]);
    render(<FeedbackScreen />);
    await waitFor(() => expect(mockedFeedbackClient.list).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Feature" }));
    await waitFor(() =>
      expect(mockedFeedbackClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ topic: "feature" }),
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: "In progress" }));
    await waitFor(() =>
      expect(mockedFeedbackClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ topic: "feature", status: "in_progress" }),
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: "Top" }));
    await waitFor(() =>
      expect(mockedFeedbackClient.list).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: "feature",
          status: "in_progress",
          sort: "top",
          page: 1,
          limit: 20,
        }),
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
      expect(screen.getByText(/loading suggestions/i)).toBeInTheDocument(),
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

    await userEvent.click(screen.getByRole("button", { name: /show 1 more/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/couldn't load more suggestions/i),
      ).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Feature" }));
    await waitFor(() =>
      expect(
        screen.queryByText(/couldn't load more suggestions/i),
      ).not.toBeInTheDocument(),
    );
  });

  // Unfiltered-empty and filtered-empty say different things: one invites the
  // first post, the other points at the filters that hid everything.
  it("invites the first post when the board is empty and unfiltered", async () => {
    mockList([]);
    render(<FeedbackScreen />);
    await waitFor(() =>
      expect(screen.getByText("No suggestions yet")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Post the first one" }),
    ).toBeInTheDocument();
  });

  it("blames the filters when a filtered board comes back empty", async () => {
    mockList([]);
    render(<FeedbackScreen />);
    await waitFor(() => expect(mockedFeedbackClient.list).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Feature" }));

    expect(
      await screen.findByText("Nothing matches these filters"),
    ).toBeInTheDocument();
    expect(screen.queryByText("No suggestions yet")).not.toBeInTheDocument();
  });

  it("shows how much of the whole list is on screen", async () => {
    mockList([makePost()], 7);
    render(<FeedbackScreen />);
    expect(await screen.findByText("Showing 1 of 7")).toBeInTheDocument();
  });

  // Clear filters must reset the search box too — resetting only the debounced
  // `q` would leave the visible input holding a term it no longer filters by.
  it("Clear filters resets the topic, the status and the search box", async () => {
    mockList([makePost()]);
    render(<FeedbackScreen />);
    await waitFor(() => expect(mockedFeedbackClient.list).toHaveBeenCalled());

    await userEvent.type(screen.getByRole("searchbox"), "crash");
    await userEvent.click(screen.getByRole("button", { name: "Feature" }));
    await userEvent.click(screen.getByRole("button", { name: "In progress" }));
    await waitFor(() =>
      expect(mockedFeedbackClient.list).toHaveBeenCalledWith(
        expect.objectContaining({
          q: "crash",
          topic: "feature",
          status: "in_progress",
        }),
      ),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Clear filters" }),
    );

    // Asserted on the controls, not on a refetch: the unfiltered key is already
    // in the query cache from mount, so clearing can legitimately serve it
    // without a new request.
    expect(screen.getByRole("searchbox")).toHaveValue("");
    const [topicAll, statusAll] = screen.getAllByRole("button", {
      name: "All",
    });
    await waitFor(() =>
      expect(topicAll).toHaveAttribute("aria-pressed", "true"),
    );
    expect(statusAll).toHaveAttribute("aria-pressed", "true");
    // Ordering isn't a filter — clearing must leave it alone.
    expect(screen.getByRole("button", { name: "Newest" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });

  it("explains every status in the rail, whatever the board contains", async () => {
    mockList([]);
    render(<FeedbackScreen />);
    await waitFor(() => expect(mockedFeedbackClient.list).toHaveBeenCalled());

    expect(screen.getByText("What the statuses mean")).toBeInTheDocument();
    expect(screen.getByText("Read, not triaged yet.")).toBeInTheDocument();
    expect(
      screen.getByText("Not planned. The reason is in the comments."),
    ).toBeInTheDocument();
  });

  it("shows an error message when the list call rejects", async () => {
    mockedFeedbackClient.list.mockRejectedValue(new Error("network"));
    render(<FeedbackScreen />);
    await waitFor(() =>
      expect(
        screen.getByText(/couldn't load suggestions/i),
      ).toBeInTheDocument(),
    );
  });

  it("routes an authenticated user to /feedback/new when clicking New suggestion", async () => {
    mockAuth(true);
    mockList([makePost()]);
    render(<FeedbackScreen />);
    await waitFor(() => expect(mockedFeedbackClient.list).toHaveBeenCalled());

    await userEvent.click(
      screen.getByRole("button", { name: /new suggestion/i }),
    );
    expect(push).toHaveBeenCalledWith("/feedback/new");
  });

  it("routes an anonymous user to /auth when clicking New suggestion", async () => {
    mockAuth(false);
    mockList([makePost()]);
    render(<FeedbackScreen />);
    await waitFor(() => expect(mockedFeedbackClient.list).toHaveBeenCalled());

    await userEvent.click(
      screen.getByRole("button", { name: /new suggestion/i }),
    );
    expect(push).toHaveBeenCalledWith("/auth?next=/feedback");
  });
});
