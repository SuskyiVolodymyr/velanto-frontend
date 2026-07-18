import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { OAuthButtons } from "./OAuthButtons";
import { authClient } from "@/src/shared/lib/auth-client";
import { openOAuthPopup } from "@/src/shared/lib/oauth-popup";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const revalidate = vi.fn();
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ revalidate }),
}));

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: { oauthProviders: vi.fn() },
}));

vi.mock("@/src/shared/lib/oauth-popup", () => ({
  openOAuthPopup: vi.fn(),
}));

const mockedProviders = vi.mocked(authClient.oauthProviders);
const mockedPopup = vi.mocked(openOAuthPopup);

describe("OAuthButtons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders both provider buttons when both are configured", async () => {
    mockedProviders.mockResolvedValue({ google: true, discord: true });
    render(<OAuthButtons />);

    expect(
      await screen.findByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with Discord" }),
    ).toBeInTheDocument();
  });

  it("renders nothing when no provider is configured", async () => {
    mockedProviders.mockResolvedValue({ google: false, discord: false });
    render(<OAuthButtons />);

    // The fetch resolves in an effect; wait for it to have been consumed.
    await waitFor(() => expect(mockedProviders).toHaveBeenCalled());

    expect(
      screen.queryByRole("button", { name: "Continue with Google" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Continue with Discord" }),
    ).toBeNull();
  });

  it("renders only the Google button when Discord is disabled", async () => {
    mockedProviders.mockResolvedValue({ google: true, discord: false });
    render(<OAuthButtons />);

    expect(
      await screen.findByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Continue with Discord" }),
    ).toBeNull();
  });

  it("opens the provider popup, revalidates the session and lands home on success", async () => {
    mockedProviders.mockResolvedValue({ google: true, discord: false });
    mockedPopup.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<OAuthButtons />);

    await user.click(
      await screen.findByRole("button", { name: "Continue with Google" }),
    );

    await waitFor(() => expect(mockedPopup).toHaveBeenCalledWith("google"));
    await waitFor(() => expect(revalidate).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith("/");
  });

  it("surfaces an error and does not navigate when the popup is blocked", async () => {
    mockedProviders.mockResolvedValue({ google: true, discord: false });
    mockedPopup.mockResolvedValue({ ok: false, error: "blocked" });
    const user = userEvent.setup();
    render(<OAuthButtons />);

    await user.click(
      await screen.findByRole("button", { name: "Continue with Google" }),
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
