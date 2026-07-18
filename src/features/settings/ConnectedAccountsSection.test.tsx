import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ConnectedAccountsSection } from "./ConnectedAccountsSection";
import { useAuth } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";

vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: { oauthProviders: vi.fn(), startOAuthLink: vi.fn() },
}));

let params = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => params }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedClient = vi.mocked(authClient);

function authAs(
  status: "authenticated" | "unauthenticated" | "loading",
  linkedProviders?: { google: boolean; discord: boolean },
) {
  mockedUseAuth.mockReturnValue({
    status,
    user: status === "authenticated" ? { id: "u1", linkedProviders } : null,
  } as unknown as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  vi.clearAllMocks();
  params = new URLSearchParams();
  mockedClient.oauthProviders.mockResolvedValue({
    google: true,
    discord: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
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
    // Give the providers fetch a tick to resolve to "none".
    await waitFor(() => expect(mockedClient.oauthProviders).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows Connected for a linked provider and Connect for an unlinked one", async () => {
    authAs("authenticated", { google: true, discord: false });
    render(<ConnectedAccountsSection />);

    expect(await screen.findByText("Google")).toBeInTheDocument();
    expect(screen.getByText("Discord")).toBeInTheDocument();
    // Google linked → status text; Discord not → a Connect button.
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /connect/i }),
    ).toBeInTheDocument();
  });

  it("arms the link then navigates to the provider on Connect", async () => {
    authAs("authenticated", { google: true, discord: false });
    mockedClient.startOAuthLink.mockResolvedValue({ started: true });
    const assign = vi.fn();
    vi.stubGlobal("location", { assign } as unknown as Location);

    const user = userEvent.setup();
    render(<ConnectedAccountsSection />);
    await user.click(await screen.findByRole("button", { name: /connect/i }));

    await waitFor(() =>
      expect(mockedClient.startOAuthLink).toHaveBeenCalledWith("discord"),
    );
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith("http://localhost:3001/auth/discord"),
    );
  });

  it("shows an error when the OAuth link round-trip failed (?linkError=1)", async () => {
    params = new URLSearchParams("linkError=1");
    authAs("authenticated", { google: false, discord: false });
    render(<ConnectedAccountsSection />);

    expect(
      await screen.findByText(/already connected to another/i),
    ).toBeInTheDocument();
  });
});
