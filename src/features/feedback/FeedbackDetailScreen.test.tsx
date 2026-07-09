import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeedbackDetailScreen } from "./FeedbackDetailScreen";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import { ApiError } from "@/src/shared/lib/api-client";
import type { Feedback } from "@/src/shared/types/feedback";

vi.mock("@/src/shared/lib/feedback-client");
vi.mock("@/src/shared/lib/auth-context");

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/feedback/f1",
}));

const mockedFeedbackClient = vi.mocked(feedbackClient);
const mockedUseAuth = vi.mocked(useAuth);

function makePost(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: "f1",
    topic: "bug",
    title: "A bug report",
    body: "Something is broken.",
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
    commentCount: 0,
    ...overrides,
  };
}

type Role = "user" | "moderator" | "manager" | "admin";

function mockAuth(user: { id: string; role: Role } | null) {
  mockedUseAuth.mockReturnValue({
    user: user
      ? { id: user.id, email: "a@x.com", username: "u", role: user.role, createdAt: "" }
      : null,
    status: user ? "authenticated" : "unauthenticated",
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  vi.resetAllMocks();
  // Comment list is fetched by the embedded FeedbackComments on every render.
  mockedFeedbackClient.listComments.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
});

describe("FeedbackDetailScreen", () => {
  it("renders a fetched post once getById resolves", async () => {
    mockAuth({ id: "u2", role: "user" });
    mockedFeedbackClient.getById.mockResolvedValue(makePost());

    render(<FeedbackDetailScreen postId="f1" />);

    expect(await screen.findByText("A bug report")).toBeInTheDocument();
    expect(screen.getByText("Something is broken.")).toBeInTheDocument();
    expect(screen.getByText(/by alice/)).toBeInTheDocument();
  });

  it("shows the status select to a staff viewer and calls setStatus on change", async () => {
    mockAuth({ id: "mod", role: "moderator" });
    mockedFeedbackClient.getById.mockResolvedValue(makePost());
    mockedFeedbackClient.setStatus.mockResolvedValue(makePost({ status: "in_progress" }));

    render(<FeedbackDetailScreen postId="f1" />);

    const select = await screen.findByLabelText("Status");
    await userEvent.selectOptions(select, "in_progress");

    await waitFor(() =>
      expect(mockedFeedbackClient.setStatus).toHaveBeenCalledWith("f1", "in_progress"),
    );
  });

  it("does not show the status select to a non-staff, non-author viewer", async () => {
    mockAuth({ id: "u2", role: "user" });
    mockedFeedbackClient.getById.mockResolvedValue(makePost());

    render(<FeedbackDetailScreen postId="f1" />);

    await screen.findByText("A bug report");
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("lets the author delete the post and redirects to /feedback", async () => {
    mockAuth({ id: "u1", role: "user" });
    mockedFeedbackClient.getById.mockResolvedValue(makePost());
    mockedFeedbackClient.remove.mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<FeedbackDetailScreen postId="f1" />);

    const deleteButton = await screen.findByRole("button", { name: "Delete" });
    await userEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => expect(mockedFeedbackClient.remove).toHaveBeenCalledWith("f1"));
    expect(push).toHaveBeenCalledWith("/feedback");
    confirmSpy.mockRestore();
  });

  it("renders the not-found state when getById rejects with a 404 ApiError", async () => {
    mockAuth({ id: "u2", role: "user" });
    mockedFeedbackClient.getById.mockRejectedValue(new ApiError(404, "Not Found", null));

    render(<FeedbackDetailScreen postId="f1" />);

    expect(
      await screen.findByText(/doesn't exist or isn't visible to you/i),
    ).toBeInTheDocument();
  });

  it("shows the translation block for a translation post", async () => {
    mockAuth({ id: "u2", role: "user" });
    mockedFeedbackClient.getById.mockResolvedValue(
      makePost({
        topic: "translation",
        locale: "uk",
        translationContext: "The play button",
        translationSuggestion: "Грати",
      }),
    );

    render(<FeedbackDetailScreen postId="f1" />);

    expect(await screen.findByText("The play button")).toBeInTheDocument();
    expect(screen.getByText("Грати")).toBeInTheDocument();
  });
});
