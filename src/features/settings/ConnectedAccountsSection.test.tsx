import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ConnectedAccountsSection } from "./ConnectedAccountsSection";
import { useAuth } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { openOAuthPopup } from "@/src/shared/lib/oauth-popup";

vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: { oauthProviders: vi.fn(), startOAuthLink: vi.fn() },
}));
vi.mock("@/src/shared/lib/oauth-popup", () => ({ openOAuthPopup: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedClient = vi.mocked(authClient);
const mockedPopup = vi.mocked(openOAuthPopup);
const revalidate = vi.fn();

function authAs(
  status: "authenticated" | "unauthenticated" | "loading",
  linkedProviders?: { google: boolean; discord: boolean },
) {
  mockedUseAuth.mockReturnValue({
    status,
    user: status === "authenticated" ? { id: "u1", linkedProviders } : null,
    revalidate,
  } as unknown as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedClient.oauthProviders.mockResolvedValue({
    google: true,
    discord: true,
  });
});

describe("ConnectedAccountsSection", () => {
  it("renders nothing when signed out", () => {
    authAs("unauthenticated");
    const { container } = render(<ConnectedAccountsSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no providers are configured", async () => {
    authAs("authenticated");
    mockedClient.oauthProviders.mockResolvedValue({
      google: false,
      discord: false,
    });
    const { container } = render(<ConnectedAccountsSection />);
    await waitFor(() => expect(mockedClient.oauthProviders).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows Connected for a linked provider and Connect for an unlinked one", async () => {
    authAs("authenticated", { google: true, discord: false });
    render(<ConnectedAccountsSection />);

    expect(await screen.findByText("Google")).toBeInTheDocument();
    expect(screen.getByText("Discord")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /connect/i }),
    ).toBeInTheDocument();
  });

  it("arms the link, opens the popup, and revalidates on success", async () => {
    authAs("authenticated", { google: true, discord: false });
    mockedClient.startOAuthLink.mockResolvedValue({ started: true });
    mockedPopup.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    render(<ConnectedAccountsSection />);
    await user.click(await screen.findByRole("button", { name: /connect/i }));

    await waitFor(() =>
      expect(mockedClient.startOAuthLink).toHaveBeenCalledWith("discord"),
    );
    await waitFor(() => expect(mockedPopup).toHaveBeenCalledWith("discord"));
    await waitFor(() => expect(revalidate).toHaveBeenCalled());
  });

  it("shows an error when the popup reports a failed link", async () => {
    authAs("authenticated", { google: true, discord: false });
    mockedClient.startOAuthLink.mockResolvedValue({ started: true });
    mockedPopup.mockResolvedValue({ ok: false, error: "oauth" });

    const user = userEvent.setup();
    render(<ConnectedAccountsSection />);
    await user.click(await screen.findByRole("button", { name: /connect/i }));

    expect(
      await screen.findByText(/already connected to another/i),
    ).toBeInTheDocument();
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("does not error when the user just closes the popup", async () => {
    authAs("authenticated", { google: true, discord: false });
    mockedClient.startOAuthLink.mockResolvedValue({ started: true });
    mockedPopup.mockResolvedValue({ ok: false, error: "closed" });

    const user = userEvent.setup();
    render(<ConnectedAccountsSection />);
    await user.click(await screen.findByRole("button", { name: /connect/i }));

    await waitFor(() => expect(mockedPopup).toHaveBeenCalled());
    expect(
      screen.queryByText(/already connected to another/i),
    ).not.toBeInTheDocument();
  });
});
