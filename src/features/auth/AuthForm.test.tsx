import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { AuthForm } from "./AuthForm";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { ApiError } from "@/src/shared/lib/api-client";

const push = vi.fn();
const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => searchParams,
}));

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    oauthProviders: vi.fn(),
  },
}));

function renderAuthForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <AuthForm />
      </AuthProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  searchParams = new URLSearchParams();
  // Silent refresh-on-mount finds no session by default — most tests don't care.
  vi.mocked(authClient.refresh).mockRejectedValue(
    new ApiError(401, "Unauthorized", {
      message: "Refresh token invalid or expired",
    }),
  );
  // Register is verify-before-create: fill the form → "Continue" requests a
  // code (mocked here) → OTP step → "Create account". Default: code sent.
  vi.mocked(authClient.requestEmailCode).mockResolvedValue({
    sent: true,
    devCode: "123456",
  });
  // No OAuth providers configured by default → OAuthButtons renders nothing,
  // leaving these tests focused on the email/password form. emailVerification
  // defaults to TRUE here so the existing two-step (Continue → OTP) tests below
  // exercise the code flow; the one-step tests override it to false.
  vi.mocked(authClient.oauthProviders).mockResolvedValue({
    google: false,
    discord: false,
    emailVerification: true,
  });
});

/** Fills a valid register form (does not submit). */
async function fillRegisterForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("tab", { name: "Sign up" }));
  await user.type(screen.getByLabelText("Username"), "alice");
  await user.type(screen.getByLabelText("Email"), "alice@example.com");
  await user.type(screen.getByLabelText("Password"), "Password123");
  await user.type(screen.getByLabelText("Confirm password"), "Password123");
  await user.click(screen.getByRole("checkbox"));
}

describe("AuthForm", () => {
  it("defaults to the login tab with an identifier + password field", () => {
    renderAuthForm();
    expect(screen.getByRole("tab", { name: "Log in" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText("Email or username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
  });

  it("switches to the register tab and shows username/email fields", async () => {
    const user = userEvent.setup();
    renderAuthForm();

    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    // Step 1 advances with "Continue"; the code is entered on the next step.
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();
  });

  it("requests a code and moves to the OTP step on Continue", async () => {
    const user = userEvent.setup();
    renderAuthForm();
    await fillRegisterForm(user);

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(authClient.requestEmailCode).toHaveBeenCalledWith(
      "alice@example.com",
    );
    expect(
      await screen.findByText(
        /one-time password was sent to alice@example.com/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/check your spam folder/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
    expect(authClient.register).not.toHaveBeenCalled();
  });

  it("registers with the entered code and redirects on success", async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.register).mockResolvedValue({
      accessToken: "access-token",
      user: {
        id: "u1",
        email: "alice@example.com",
        username: "alice",
        role: "user",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    renderAuthForm();
    await fillRegisterForm(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.type(
      await screen.findByLabelText("Verification code"),
      "123456",
    );
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(authClient.register).toHaveBeenCalledWith({
      email: "alice@example.com",
      username: "alice",
      password: "Password123",
      acceptedRules: true,
      code: "123456",
    });
  });

  // Email verification is env-gated on the backend and off by default; when it
  // reports off, register is one step — no "Continue", no emailed code.
  it("registers in one step without a code when email verification is off", async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.oauthProviders).mockResolvedValue({
      google: false,
      discord: false,
      emailVerification: false,
    });
    vi.mocked(authClient.register).mockResolvedValue({
      accessToken: "access-token",
      user: {
        id: "u1",
        email: "alice@example.com",
        username: "alice",
        role: "user",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    renderAuthForm();
    await fillRegisterForm(user);

    // The primary button creates the account directly — there is no Continue step.
    expect(
      screen.queryByRole("button", { name: "Continue" }),
    ).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", { name: "Create account" }),
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(authClient.requestEmailCode).not.toHaveBeenCalled();
    // No `code` key at all — the backend rejects an empty string against its
    // 6-digit rule, so it must be omitted, not sent blank.
    expect(authClient.register).toHaveBeenCalledWith({
      email: "alice@example.com",
      username: "alice",
      password: "Password123",
      acceptedRules: true,
    });
  });

  it("redirects an already-signed-in visitor away from the auth screen", async () => {
    vi.mocked(authClient.refresh).mockResolvedValue({
      accessToken: "access-token",
      user: {
        id: "u1",
        email: "a@example.com",
        username: "alice",
        role: "user",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    renderAuthForm();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("honors a sanitized ?next= when redirecting an already-signed-in visitor", async () => {
    searchParams = new URLSearchParams({ next: "/create" });
    vi.mocked(authClient.refresh).mockResolvedValue({
      accessToken: "access-token",
      user: {
        id: "u1",
        email: "a@example.com",
        username: "alice",
        role: "user",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    renderAuthForm();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/create"));
  });

  it("links the footer Terms and Privacy Policy to their pages", () => {
    renderAuthForm();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("rejects an empty login submission without calling the API", async () => {
    const user = userEvent.setup();
    renderAuthForm();

    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(
      screen.getByText("Enter your email/username and password."),
    ).toBeInTheDocument();
    expect(authClient.login).not.toHaveBeenCalled();
  });

  it("rejects a username with invalid characters without calling the API", async () => {
    const user = userEvent.setup();
    renderAuthForm();
    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    await user.type(screen.getByLabelText("Username"), "no spaces!");
    await user.type(screen.getByLabelText("Email"), "a@example.com");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByText(
        "Username must be 2-16 characters: letters and numbers only.",
      ),
    ).toBeInTheDocument();
    expect(authClient.requestEmailCode).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than 8 characters without calling the API", async () => {
    const user = userEvent.setup();
    renderAuthForm();
    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Email"), "a@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByText("Password must be at least 8 characters."),
    ).toBeInTheDocument();
    expect(authClient.requestEmailCode).not.toHaveBeenCalled();
  });

  it("wires the validation error to its field inline (aria-invalid + describedby)", async () => {
    const user = userEvent.setup();
    renderAuthForm();
    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Email"), "a@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("aria-invalid", "true");
    const errorId = password.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId!)).toHaveTextContent(
      "Password must be at least 8 characters.",
    );
  });

  it("switching tabs clears a previously shown error", async () => {
    const user = userEvent.setup();
    renderAuthForm();

    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(
      screen.getByText("Enter your email/username and password."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Sign up" }));
    expect(
      screen.queryByText("Enter your email/username and password."),
    ).not.toBeInTheDocument();
  });

  it("logs in with trimmed credentials and redirects home on success", async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.login).mockResolvedValue({
      accessToken: "access-token",
      user: {
        id: "u1",
        email: "a@example.com",
        username: "alice",
        role: "user",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    renderAuthForm();

    await user.type(screen.getByLabelText("Email or username"), "  alice  ");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(authClient.login).toHaveBeenCalledWith({
      identifier: "alice",
      password: "password123",
    });
  });

  it("redirects to a sanitized ?next= path on successful login instead of home", async () => {
    searchParams = new URLSearchParams({ next: "/create" });
    const user = userEvent.setup();
    vi.mocked(authClient.login).mockResolvedValue({
      accessToken: "access-token",
      user: {
        id: "u1",
        email: "a@example.com",
        username: "alice",
        role: "user",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    renderAuthForm();

    await user.type(screen.getByLabelText("Email or username"), "alice");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/create"));
  });

  it("ignores an unsafe ?next= value and redirects home instead", async () => {
    searchParams = new URLSearchParams({ next: "https://evil.com" });
    const user = userEvent.setup();
    vi.mocked(authClient.login).mockResolvedValue({
      accessToken: "access-token",
      user: {
        id: "u1",
        email: "a@example.com",
        username: "alice",
        role: "user",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    renderAuthForm();

    await user.type(screen.getByLabelText("Email or username"), "alice");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("shows the server error message and does not redirect on invalid credentials", async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.login).mockRejectedValue(
      new ApiError(401, "Unauthorized", null),
    );
    renderAuthForm();

    await user.type(screen.getByLabelText("Email or username"), "alice");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Invalid credentials.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  // The 16+ minimum lives in the Terms and the Privacy Policy, NOT here
  // (velanto-frontend#251). The checkbox asks one thing: do you accept the
  // Community Rules.
  //
  // This test asserted the opposite until #251, on the strength of a decision
  // recorded in #229 that was never actually taken — the user's "if it in terms
  // and privacy thats fine with me" was read as assent to folding the age in,
  // when it meant the documents were enough. Pinned so the age doesn't drift
  // back in from the issue history, which still reads the other way.
  //
  // The declaration still exists: `auth.terms` says "By continuing you agree to
  // Velanto's Terms", and the Terms state the minimum. It is passive rather
  // than an affirmative tick, and it leaves no per-user record, which was the
  // trade-off accepted here.
  it("does not put an age declaration on the rules checkbox", async () => {
    const user = userEvent.setup();
    renderAuthForm();
    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    const box = screen.getByRole("checkbox");
    expect(box).toHaveAccessibleName(/Community Rules/i);
    expect(box).not.toHaveAccessibleName(/16/);
  });

  it("rejects registration when the rules-acceptance box is unchecked", async () => {
    const user = userEvent.setup();
    renderAuthForm();
    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Email"), "a@example.com");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.type(screen.getByLabelText("Confirm password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByText("You must accept the Community Rules to register."),
    ).toBeInTheDocument();
    expect(authClient.requestEmailCode).not.toHaveBeenCalled();
  });

  it("rejects registration when the two passwords do not match", async () => {
    const user = userEvent.setup();
    renderAuthForm();
    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Email"), "a@example.com");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.type(screen.getByLabelText("Confirm password"), "Password124");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(authClient.requestEmailCode).not.toHaveBeenCalled();
  });

  it("disables the submit button while a request is pending, preventing a double submit", async () => {
    const user = userEvent.setup();
    let resolveLogin: (value: {
      accessToken: string;
      user: import("@/src/shared/types/user").User;
    }) => void;
    vi.mocked(authClient.login).mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );
    renderAuthForm();

    await user.type(screen.getByLabelText("Email or username"), "alice");
    await user.type(screen.getByLabelText("Password"), "password123");

    const submitButton = screen.getByRole("button", { name: "Log in" });
    await user.click(submitButton);

    expect(screen.getByRole("button", { name: "Please wait…" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Please wait…" }));
    expect(authClient.login).toHaveBeenCalledTimes(1);

    resolveLogin!({
      accessToken: "access-token",
      user: {
        id: "u1",
        email: "a@example.com",
        username: "alice",
        role: "user",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });
});
