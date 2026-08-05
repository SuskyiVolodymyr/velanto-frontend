import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ApiTokensSection } from "./ApiTokensSection";
import { useAuth } from "@/src/shared/lib/auth-context";
import {
  useApiTokens,
  useCreateToken,
  useRevokeToken,
} from "@/src/features/docs/api/tokens.queries";
import type { ApiToken } from "@/src/shared/lib/tokens-client";

vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/src/features/docs/api/tokens.queries", () => ({
  useApiTokens: vi.fn(),
  useCreateToken: vi.fn(),
  useRevokeToken: vi.fn(),
}));

const createMutate = vi.fn();
const revokeMutate = vi.fn();

function authAs(
  status: "authenticated" | "unauthenticated" | "loading",
  role: string = "user",
) {
  vi.mocked(useAuth).mockReturnValue({
    status,
    user: status === "authenticated" ? { id: "u1", role } : null,
  } as unknown as ReturnType<typeof useAuth>);
}

function tokens(list: ApiToken[]) {
  vi.mocked(useApiTokens).mockReturnValue({
    data: list,
    isLoading: false,
  } as unknown as ReturnType<typeof useApiTokens>);
}

describe("ApiTokensSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokens([]);
    vi.mocked(useCreateToken).mockReturnValue({
      mutateAsync: createMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateToken>);
    vi.mocked(useRevokeToken).mockReturnValue({
      mutateAsync: revokeMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useRevokeToken>);
  });

  // The docs page is public, so a signed-out reader still sees the manager —
  // blocked with a reason rather than hidden or redirected (anon-gate rule).
  it("blocks the create button when signed out, instead of hiding the manager", () => {
    authAs("unauthenticated");
    render(<ApiTokensSection />);

    const createBtn = screen.getByRole("button", { name: /create token/i });
    expect(createBtn).toBeInTheDocument();
    expect(createBtn).toHaveAttribute("aria-disabled", "true");
    // aria-disabled, not `disabled` — a natively disabled button swallows the
    // click, so the sign-in prompt would never open.
    expect(createBtn).not.toBeDisabled();
  });

  it("explains why the create button is blocked when signed out", async () => {
    authAs("unauthenticated");
    const user = userEvent.setup();
    render(<ApiTokensSection />);

    await user.click(screen.getByRole("button", { name: /create token/i }));

    expect(await screen.findByRole("dialog")).toHaveTextContent(
      /log in to create api tokens/i,
    );
  });

  // Fills the form completely first, so `authed` is the ONLY thing left that can
  // stop the submit. Clicking an empty form would pass even without the guard.
  it("does not create a token when a signed-out visitor completes the form and clicks create", async () => {
    authAs("unauthenticated");
    const user = userEvent.setup();
    render(<ApiTokensSection />);

    await user.type(screen.getByPlaceholderText(/claude desktop/i), "My token");
    await user.click(
      screen.getByRole("checkbox", { name: /create and edit packs/i }),
    );
    await user.click(screen.getByRole("button", { name: /create token/i }));

    expect(createMutate).not.toHaveBeenCalled();
  });

  it("does not fetch tokens when signed out", () => {
    authAs("unauthenticated");
    render(<ApiTokensSection />);
    expect(vi.mocked(useApiTokens)).toHaveBeenCalledWith({ enabled: false });
  });

  it("does not render the token list when signed out", () => {
    authAs("unauthenticated");
    render(<ApiTokensSection />);
    expect(screen.queryByText(/your tokens/i)).not.toBeInTheDocument();
  });

  // While the session is still resolving we don't yet know the viewer is signed
  // out, so claiming "log in to create API tokens" would be a lie to someone who
  // IS logged in. Blocked means unauthenticated, never merely not-yet-known.
  it("does not claim the viewer is signed out while the session is still loading", () => {
    authAs("loading");
    render(<ApiTokensSection />);

    const createBtn = screen.getByRole("button", { name: /create token/i });
    expect(createBtn).not.toHaveAttribute("aria-disabled");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    // Nothing to submit yet either way — but plainly disabled, not "blocked".
    expect(createBtn).toBeDisabled();
  });

  it("hides the moderation scope from non-staff and shows it to staff", () => {
    authAs("authenticated", "user");
    const { rerender } = render(<ApiTokensSection />);
    expect(screen.queryByText(/^Moderation$/)).not.toBeInTheDocument();

    authAs("authenticated", "moderator");
    rerender(<ApiTokensSection />);
    expect(screen.getByText(/^Moderation$/)).toBeInTheDocument();
  });

  it("orders the scope checkboxes safest-first (profile:read) and moderation last", () => {
    authAs("authenticated", "moderator");
    render(<ApiTokensSection />);

    // Each scope is one role="checkbox" row carrying its id in data-scope
    // (the mock prints a human label + description on the row, not the raw
    // id). DOM order is the checkbox order.
    const scopeIds = screen
      .getAllByRole("checkbox")
      .map((el) => el.getAttribute("data-scope"));

    expect(scopeIds).toEqual([
      "profile:read",
      "packs:read",
      "packs:write",
      "packs:delete",
      "moderation",
    ]);
  });

  it("shows loading skeletons (not the empty-state text) while tokens load", () => {
    authAs("authenticated");
    vi.mocked(useApiTokens).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useApiTokens>);

    const { container } = render(<ApiTokensSection />);

    expect(
      screen.queryByText(/haven.t created any tokens/i),
    ).not.toBeInTheDocument();
    expect(
      container.querySelectorAll(".animate-shimmer").length,
    ).toBeGreaterThan(0);
  });

  it("requires a name and at least one scope before creating", async () => {
    authAs("authenticated");
    const user = userEvent.setup();
    render(<ApiTokensSection />);

    const createBtn = screen.getByRole("button", { name: /create token/i });
    expect(createBtn).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/claude desktop/i), "My token");
    expect(createBtn).toBeDisabled(); // still no scope

    await user.click(
      screen.getByRole("checkbox", { name: /create and edit packs/i }),
    );
    expect(createBtn).toBeEnabled();
  });

  it("creates a token with the chosen name, scopes and expiry, then shows the secret once", async () => {
    authAs("authenticated");
    createMutate.mockResolvedValue({
      id: "t1",
      name: "My token",
      scopes: ["packs:read", "packs:write"],
      plaintext: "vlt_pat_t1_secret",
      lastUsedAt: null,
      expiresAt: null,
      createdAt: "2026-07-15T00:00:00.000Z",
    });
    const user = userEvent.setup();
    render(<ApiTokensSection />);

    await user.type(screen.getByPlaceholderText(/claude desktop/i), "My token");
    await user.click(screen.getByRole("checkbox", { name: /^read packs/i }));
    await user.click(
      screen.getByRole("checkbox", { name: /create and edit packs/i }),
    );
    // Expiry is a chip row (mock), not a <select>.
    await user.click(screen.getByRole("radio", { name: /1 year/i }));
    await user.click(screen.getByRole("button", { name: /create token/i }));

    await waitFor(() =>
      expect(createMutate).toHaveBeenCalledWith({
        name: "My token",
        scopes: ["packs:read", "packs:write"],
        expiresInDays: 365,
      }),
    );

    // The plaintext is shown once, in a dialog.
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("vlt_pat_t1_secret")).toBeInTheDocument();
  });

  it("lists existing tokens and revokes one after confirmation", async () => {
    authAs("authenticated");
    tokens([
      {
        id: "t1",
        name: "Old token",
        scopes: ["packs:read"],
        lastUsedAt: null,
        expiresAt: null,
        createdAt: "2026-07-15T00:00:00.000Z",
      },
    ]);
    revokeMutate.mockResolvedValue({ revoked: true });
    const user = userEvent.setup();
    render(<ApiTokensSection />);

    expect(screen.getByText("Old token")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /revoke/i }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^revoke$/i }));

    await waitFor(() => expect(revokeMutate).toHaveBeenCalledWith("t1"));
  });
});
