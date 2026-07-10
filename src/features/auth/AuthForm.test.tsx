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
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
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
  searchParams = new URLSearchParams();
  // Silent refresh-on-mount finds no session by default — most tests don't care.
  vi.mocked(authClient.refresh).mockRejectedValue(
    new ApiError(401, "Unauthorized", {
      message: "Refresh token invalid or expired",
    }),
  );
});

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
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
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
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      screen.getByText(
        "Username must be 3-20 characters: letters, numbers, underscore only.",
      ),
    ).toBeInTheDocument();
    expect(authClient.register).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than 8 characters without calling the API", async () => {
    const user = userEvent.setup();
    renderAuthForm();
    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Email"), "a@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      screen.getByText("Password must be at least 8 characters."),
    ).toBeInTheDocument();
    expect(authClient.register).not.toHaveBeenCalled();
  });

  it("wires the validation error to its field inline (aria-invalid + describedby)", async () => {
    const user = userEvent.setup();
    renderAuthForm();
    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Email"), "a@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Create account" }));

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

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
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

    await waitFor(() => expect(push).toHaveBeenCalledWith("/create"));
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

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
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
    expect(push).not.toHaveBeenCalled();
  });

  it("rejects registration when the rules-acceptance box is unchecked", async () => {
    const user = userEvent.setup();
    renderAuthForm();
    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Email"), "a@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      screen.getByText("You must accept the Community Rules to register."),
    ).toBeInTheDocument();
    expect(authClient.register).not.toHaveBeenCalled();
  });

  it("registers with acceptedRules:true once the box is checked", async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.register).mockResolvedValue({
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
    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    await user.type(screen.getByLabelText("Username"), "  alice  ");
    await user.type(screen.getByLabelText("Email"), "  a@example.com  ");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(authClient.register).toHaveBeenCalledWith({
      username: "alice",
      email: "a@example.com",
      password: "password123",
      acceptedRules: true,
    });
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
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });
});
