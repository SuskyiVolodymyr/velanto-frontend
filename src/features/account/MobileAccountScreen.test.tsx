import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { MobileAccountScreen } from "./MobileAccountScreen";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { User } from "@/src/shared/types/user";

vi.mock("@/src/shared/lib/auth-context");
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const mockedUseAuth = vi.mocked(useAuth);
const logout = vi.fn();

const USER: User = {
  id: "u1",
  email: "a@x.com",
  username: "alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function mockAuth(
  status: "authenticated" | "unauthenticated" | "loading",
  user: User | null = USER,
) {
  mockedUseAuth.mockReturnValue({
    status,
    user: status === "authenticated" ? user : null,
    logout,
  } as unknown as ReturnType<typeof useAuth>);
}

describe("MobileAccountScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists the account links including Rules, and links the header to the profile", () => {
    mockAuth("authenticated");
    render(<MobileAccountScreen />);
    expect(screen.getByRole("link", { name: /Rules/ })).toHaveAttribute(
      "href",
      "/rules",
    );
    expect(screen.getByRole("link", { name: /Settings/ })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.getByRole("link", { name: /alice/ })).toHaveAttribute(
      "href",
      "/users/u1",
    );
  });

  it("hides staff links for a plain user", () => {
    mockAuth("authenticated");
    render(<MobileAccountScreen />);
    expect(
      screen.queryByRole("link", { name: /Moderation/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Admin/ }),
    ).not.toBeInTheDocument();
  });

  it("shows Moderation and Admin for an admin", () => {
    mockAuth("authenticated", { ...USER, role: "admin" });
    render(<MobileAccountScreen />);
    expect(screen.getByRole("link", { name: /Moderation/ })).toHaveAttribute(
      "href",
      "/moderation",
    );
    expect(screen.getByRole("link", { name: /Admin/ })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("shows Moderation but not Admin for a moderator", () => {
    mockAuth("authenticated", { ...USER, role: "moderator" });
    render(<MobileAccountScreen />);
    expect(
      screen.getByRole("link", { name: /Moderation/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Admin/ }),
    ).not.toBeInTheDocument();
  });

  it("logs out when Log out is pressed", async () => {
    mockAuth("authenticated");
    render(<MobileAccountScreen />);
    await userEvent.click(screen.getByRole("button", { name: /Log out/ }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("redirects a signed-out visitor to /auth and renders nothing", () => {
    mockAuth("unauthenticated", null);
    const { container } = render(<MobileAccountScreen />);
    expect(replace).toHaveBeenCalledWith("/auth");
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing and does NOT redirect while auth is still loading", () => {
    mockAuth("loading", null);
    const { container } = render(<MobileAccountScreen />);
    expect(container).toBeEmptyDOMElement();
    expect(replace).not.toHaveBeenCalled();
  });
});
