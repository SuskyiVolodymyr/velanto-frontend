import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NewFeedbackForm, validate, type NewFeedbackFields } from "./NewFeedbackForm";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { Feedback } from "@/src/shared/types/feedback";

vi.mock("@/src/shared/lib/feedback-client");
vi.mock("@/src/shared/lib/auth-context");

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/feedback/new",
}));

const mockedFeedbackClient = vi.mocked(feedbackClient);
const mockedUseAuth = vi.mocked(useAuth);

function mockAuth(status: "authenticated" | "unauthenticated" | "loading") {
  mockedUseAuth.mockReturnValue({
    user:
      status === "authenticated"
        ? { id: "u1", email: "a@x.com", username: "alice", role: "user", createdAt: "" }
        : null,
    status,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

function makeFields(overrides: Partial<NewFeedbackFields> = {}): NewFeedbackFields {
  return {
    topic: "bug",
    title: "A title",
    body: "Some details",
    visibility: "everyone",
    locale: "",
    translationContext: "",
    translationSuggestion: "",
    ...overrides,
  };
}

function makePost(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: "fb1",
    topic: "bug",
    title: "A title",
    body: "Some details",
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
    score: 0,
    likes: 0,
    dislikes: 0,
    myVote: null,
    commentCount: 0,
    ...overrides,
  };
}

describe("validate", () => {
  it("returns null for a bug post with title + body", () => {
    expect(validate(makeFields())).toBeNull();
  });

  it("returns a message when the title is empty", () => {
    expect(validate(makeFields({ title: "   " }))).not.toBeNull();
  });

  it("returns a message for a translation post missing the locale", () => {
    expect(
      validate(makeFields({ topic: "translation", locale: "", translationSuggestion: "Better wording" })),
    ).not.toBeNull();
  });

  it("returns a message for a translation post missing the suggestion", () => {
    expect(
      validate(makeFields({ topic: "translation", locale: "uk", translationSuggestion: "  " })),
    ).not.toBeNull();
  });

  it("returns null for a valid translation post", () => {
    expect(
      validate(makeFields({ topic: "translation", locale: "uk", translationSuggestion: "Better wording" })),
    ).toBeNull();
  });
});

describe("NewFeedbackForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth("authenticated");
  });

  it("hides translation-specific fields for a bug post and reveals them after switching to Translation", async () => {
    render(<NewFeedbackForm />);

    expect(screen.queryByLabelText(/suggested wording/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Translation" }));

    expect(screen.getByLabelText(/suggested wording/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
  });

  it("submits a valid bug post with the right payload and redirects to the created post", async () => {
    mockedFeedbackClient.create.mockResolvedValue(makePost({ id: "fb1" }));
    render(<NewFeedbackForm />);

    await userEvent.type(screen.getByLabelText(/title/i), "My bug");
    await userEvent.type(screen.getByLabelText(/details/i), "It crashes on load");
    await userEvent.click(screen.getByRole("button", { name: /post feedback/i }));

    await waitFor(() =>
      expect(mockedFeedbackClient.create).toHaveBeenCalledWith({
        topic: "bug",
        title: "My bug",
        body: "It crashes on load",
        visibility: "everyone",
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/feedback/fb1"));
  });
});
