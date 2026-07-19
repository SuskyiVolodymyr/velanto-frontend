import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { ProfileEditForm } from "./ProfileEditForm";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { usersClient } from "@/src/shared/lib/users-client";
import { ApiError } from "@/src/shared/lib/api-client";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));
vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    changeUsername: vi.fn(),
    ban: vi.fn(),
    unban: vi.fn(),
    changeRole: vi.fn(),
  },
}));

const MOCK_USER = {
  id: "u1",
  email: "a@example.com",
  username: "alice",
  role: "user" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderForm() {
  return render(
    <AuthProvider>
      <ProfileEditForm />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "t",
    user: MOCK_USER,
  });
  vi.mocked(usersClient.getProfile).mockResolvedValue({
    id: "u1",
    username: "alice",
    bio: "Old bio",
    createdAt: "2026-01-01T00:00:00.000Z",
    followerCount: 0,
    followingCount: 0,
    isFollowedByMe: null,
  });
  vi.mocked(usersClient.updateProfile).mockResolvedValue({
    id: "u1",
    bio: "New bio",
  });
  vi.mocked(usersClient.changeUsername).mockResolvedValue({
    id: "u1",
    username: "alice2",
  });
});

describe("ProfileEditForm", () => {
  it("pre-fills the textarea with the current bio", async () => {
    renderForm();
    expect(await screen.findByDisplayValue("Old bio")).toBeInTheDocument();
  });

  it("saves the new bio and redirects to the profile page on success", async () => {
    const user = userEvent.setup();
    renderForm();
    const textarea = await screen.findByDisplayValue("Old bio");
    await user.clear(textarea);
    await user.type(textarea, "New bio");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(usersClient.updateProfile).toHaveBeenCalledWith("New bio"),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/users/u1"));
  });

  it("shows a character count against the 280 limit", async () => {
    renderForm();
    await screen.findByDisplayValue("Old bio");
    expect(screen.getByText(/280/)).toBeInTheDocument();
  });

  it("shows an error message if saving fails", async () => {
    vi.mocked(usersClient.updateProfile).mockRejectedValue(
      new Error("network error"),
    );
    const user = userEvent.setup();
    renderForm();
    await screen.findByDisplayValue("Old bio");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/couldn.t save/i)).toBeInTheDocument();
  });

  it("surfaces the backend's blocked-term rejection inline and does not navigate", async () => {
    // Real nestjs-zod validation 400 shape: the field-level moderation
    // rejection lives under `errors[]`. The bio itself is innocuous.
    vi.mocked(usersClient.updateProfile).mockRejectedValue(
      new ApiError(400, "Bad Request", {
        statusCode: 400,
        message: "Validation failed",
        errors: [
          {
            code: "custom",
            path: ["bio"],
            message:
              "This text contains language that isn't allowed on Velanto.",
          },
        ],
      }),
    );
    const user = userEvent.setup();
    renderForm();
    const textarea = await screen.findByDisplayValue("Old bio");
    await user.clear(textarea);
    await user.type(textarea, "New bio");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(
        "This text contains language that isn't allowed on Velanto.",
      ),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("pre-fills the username field with the current username", async () => {
    renderForm();
    expect(
      await screen.findByRole("textbox", { name: "Username" }),
    ).toHaveValue("alice");
  });

  it("changes the username (then saves bio) and redirects on success", async () => {
    const user = userEvent.setup();
    renderForm();
    const usernameInput = await screen.findByRole("textbox", {
      name: "Username",
    });
    await user.clear(usernameInput);
    await user.type(usernameInput, "alice2");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(usersClient.changeUsername).toHaveBeenCalledWith("alice2"),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/users/u1"));
  });

  it("does not call the username endpoint when the username is unchanged", async () => {
    const user = userEvent.setup();
    renderForm();
    const textarea = await screen.findByDisplayValue("Old bio");
    await user.clear(textarea);
    await user.type(textarea, "New bio");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/users/u1"));
    expect(usersClient.changeUsername).not.toHaveBeenCalled();
  });

  it("shows a taken error on 409 and does not save or navigate", async () => {
    vi.mocked(usersClient.changeUsername).mockRejectedValue(
      new ApiError(409, "Conflict", { message: "taken" }),
    );
    const user = userEvent.setup();
    renderForm();
    const usernameInput = await screen.findByRole("textbox", {
      name: "Username",
    });
    await user.clear(usernameInput);
    await user.type(usernameInput, "taken1");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText("That username is already taken."),
    ).toBeInTheDocument();
    expect(usersClient.updateProfile).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("rejects an invalid username format without calling the backend", async () => {
    const user = userEvent.setup();
    renderForm();
    const usernameInput = await screen.findByRole("textbox", {
      name: "Username",
    });
    await user.clear(usernameInput);
    await user.type(usernameInput, "a");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText(/2-16 characters/i)).toBeInTheDocument(),
    );
    expect(usersClient.changeUsername).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a log-in prompt when the viewer is not authenticated", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(
      new ApiError(401, "Unauthorized", null),
    );
    renderForm();
    expect(
      await screen.findByText(/need to be logged in/i),
    ).toBeInTheDocument();
  });

  it("shows an error message if the initial bio load fails", async () => {
    vi.mocked(usersClient.getProfile).mockRejectedValue(
      new Error("network error"),
    );
    renderForm();
    expect(await screen.findByText(/couldn.t load/i)).toBeInTheDocument();
  });
});
