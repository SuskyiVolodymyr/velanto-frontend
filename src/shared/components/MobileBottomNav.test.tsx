import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { MobileBottomNav } from "./MobileBottomNav";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useNotifications } from "@/src/shared/components/use-notifications";

vi.mock("@/src/shared/lib/auth-context");
vi.mock("@/src/shared/components/use-notifications");
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseNotifications = vi.mocked(useNotifications);

function mockAuth(status: "authenticated" | "unauthenticated") {
  mockedUseAuth.mockReturnValue({ status } as ReturnType<typeof useAuth>);
}

function linkFor(name: string) {
  return screen.getByRole("link", { name: new RegExp(name, "i") });
}

describe("MobileBottomNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseNotifications.mockReturnValue({
      unreadCount: 0,
    } as ReturnType<typeof useNotifications>);
  });

  it("shows all five tabs", () => {
    mockAuth("authenticated");
    render(<MobileBottomNav />);
    for (const label of [
      "Discovery",
      "Feedback",
      "Create",
      "Alerts",
      "Profile",
    ]) {
      expect(linkFor(label)).toBeInTheDocument();
    }
  });

  it("points auth-gated tabs at their real destinations when signed in", () => {
    mockAuth("authenticated");
    render(<MobileBottomNav />);
    expect(linkFor("Create")).toHaveAttribute("href", "/create");
    expect(linkFor("Alerts")).toHaveAttribute("href", "/notifications");
    expect(linkFor("Profile")).toHaveAttribute("href", "/account");
    // Public tabs are unaffected.
    expect(linkFor("Discovery")).toHaveAttribute("href", "/");
  });

  it("redirects auth-gated tabs to /auth when signed out, leaving public tabs alone", () => {
    mockAuth("unauthenticated");
    render(<MobileBottomNav />);
    expect(linkFor("Create")).toHaveAttribute("href", "/auth");
    expect(linkFor("Alerts")).toHaveAttribute("href", "/auth");
    expect(linkFor("Profile")).toHaveAttribute("href", "/auth");
    expect(linkFor("Discovery")).toHaveAttribute("href", "/");
    expect(linkFor("Feedback")).toHaveAttribute("href", "/feedback");
  });

  it("marks the tab matching the current path as current", () => {
    mockAuth("authenticated");
    render(<MobileBottomNav />);
    // usePathname is mocked to "/", so Discovery is current.
    expect(linkFor("Discovery")).toHaveAttribute("aria-current", "page");
    expect(linkFor("Create")).not.toHaveAttribute("aria-current");
  });
});
