import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NewFeedbackForm } from "./NewFeedbackForm";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { ApiError } from "@/src/shared/lib/api-client";
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
        ? {
            id: "u1",
            email: "a@x.com",
            username: "alice",
            role: "user",
            createdAt: "",
          }
        : null,
    status,
    login: vi.fn(),
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setAvatarKey: vi.fn(),
    patchUser: vi.fn(),
  } as ReturnType<typeof useAuth>);
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

describe("NewFeedbackForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth("authenticated");
  });

  it("hides translation-specific fields for a bug post and reveals them after switching to Translation", async () => {
    render(<NewFeedbackForm />);

    expect(
      screen.queryByLabelText(/suggested wording/i),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Translation" }));

    expect(screen.getByLabelText(/suggested wording/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
  });

  it("submits a valid bug post with the right payload and redirects to the created post", async () => {
    mockedFeedbackClient.create.mockResolvedValue(makePost({ id: "fb1" }));
    render(<NewFeedbackForm />);

    await userEvent.type(screen.getByLabelText(/title/i), "My bug");
    await userEvent.type(
      screen.getByLabelText(/details/i),
      "It crashes on load",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /post feedback/i }),
    );

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

  it("submits a translation post with the locale + suggestion payload", async () => {
    mockedFeedbackClient.create.mockResolvedValue(makePost({ id: "fb9" }));
    render(<NewFeedbackForm />);

    await userEvent.click(screen.getByRole("radio", { name: "Translation" }));
    await userEvent.type(screen.getByLabelText(/title/i), "Wrong word");
    await userEvent.type(
      screen.getByLabelText(/details/i),
      "The label reads oddly",
    );
    await userEvent.selectOptions(screen.getByLabelText(/language/i), "uk");
    await userEvent.type(
      screen.getByLabelText(/suggested wording/i),
      "Краще формулювання",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /post feedback/i }),
    );

    await waitFor(() =>
      expect(mockedFeedbackClient.create).toHaveBeenCalledWith({
        topic: "translation",
        title: "Wrong word",
        body: "The label reads oddly",
        visibility: "everyone",
        locale: "uk",
        translationSuggestion: "Краще формулювання",
      }),
    );
  });

  it("shows a validation message and does not submit when required fields are empty", async () => {
    render(<NewFeedbackForm />);

    await userEvent.click(
      screen.getByRole("button", { name: /post feedback/i }),
    );

    expect(await screen.findByText("Title is required.")).toBeInTheDocument();
    expect(mockedFeedbackClient.create).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("requires the language and suggestion for a translation post", async () => {
    render(<NewFeedbackForm />);

    await userEvent.click(screen.getByRole("radio", { name: "Translation" }));
    await userEvent.type(screen.getByLabelText(/title/i), "Wrong word");
    await userEvent.type(
      screen.getByLabelText(/details/i),
      "The label reads oddly",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /post feedback/i }),
    );

    expect(
      await screen.findByText(
        "Please choose the language for your translation suggestion.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Please enter your suggested wording."),
    ).toBeInTheDocument();
    expect(mockedFeedbackClient.create).not.toHaveBeenCalled();
  });

  it("surfaces a server error message when the create call fails", async () => {
    mockedFeedbackClient.create.mockRejectedValue(
      new ApiError(400, "Bad Request", { message: "That topic is closed." }),
    );
    render(<NewFeedbackForm />);

    await userEvent.type(screen.getByLabelText(/title/i), "My bug");
    await userEvent.type(
      screen.getByLabelText(/details/i),
      "It crashes on load",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /post feedback/i }),
    );

    expect(
      await screen.findByText("That topic is closed."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("surfaces the backend's blocked-term rejection inline and does not navigate", async () => {
    // Real nestjs-zod validation 400 shape: generic top-level `message`, the
    // field-level moderation rejection under `errors[]`. Input stays innocuous.
    mockedFeedbackClient.create.mockRejectedValue(
      new ApiError(400, "Bad Request", {
        statusCode: 400,
        message: "Validation failed",
        errors: [
          {
            code: "custom",
            path: ["body"],
            message:
              "This text contains language that isn't allowed on Velanto.",
          },
        ],
      }),
    );
    render(<NewFeedbackForm />);

    await userEvent.type(screen.getByLabelText(/title/i), "My bug");
    await userEvent.type(
      screen.getByLabelText(/details/i),
      "It crashes on load",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /post feedback/i }),
    );

    expect(
      await screen.findByText(
        "This text contains language that isn't allowed on Velanto.",
      ),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("disables the submit button while the create call is in flight", async () => {
    let resolveCreate: (value: Feedback) => void = () => {};
    mockedFeedbackClient.create.mockReturnValue(
      new Promise<Feedback>((resolve) => {
        resolveCreate = resolve;
      }),
    );
    render(<NewFeedbackForm />);

    await userEvent.type(screen.getByLabelText(/title/i), "My bug");
    await userEvent.type(
      screen.getByLabelText(/details/i),
      "It crashes on load",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /post feedback/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /posting/i })).toBeDisabled(),
    );

    resolveCreate(makePost({ id: "fb1" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/feedback/fb1"));
  });
});
