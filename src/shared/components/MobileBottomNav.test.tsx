import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { MobileBottomNav } from "./MobileBottomNav";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/auth-context");
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const mockedUseAuth = vi.mocked(useAuth);

function mockAuth(status: "authenticated" | "unauthenticated") {
  mockedUseAuth.mockReturnValue({ status } as ReturnType<typeof useAuth>);
}

function linkFor(name: string) {
  return screen.getByRole("link", { name: new RegExp(name, "i") });
}

describe("MobileBottomNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows all five tabs", () => {
    mockAuth("authenticated");
    render(<MobileBottomNav />);
    for (const label of [
      "Browse",
      "My packs",
      "Create",
      "Suggestions",
      "Profile",
    ]) {
      expect(linkFor(label)).toBeInTheDocument();
    }
  });

  it("points auth-gated tabs at their real destinations when signed in", () => {
    mockAuth("authenticated");
    render(<MobileBottomNav />);
    expect(linkFor("My packs")).toHaveAttribute("href", "/my-packs");
    expect(linkFor("Create")).toHaveAttribute("href", "/create");
    expect(linkFor("Profile")).toHaveAttribute("href", "/account");
    // Public tabs are unaffected.
    expect(linkFor("Browse")).toHaveAttribute("href", "/");
    expect(linkFor("Suggestions")).toHaveAttribute("href", "/feedback");
  });

  it("redirects auth-gated tabs to /auth when signed out, leaving public tabs alone", () => {
    mockAuth("unauthenticated");
    render(<MobileBottomNav />);
    expect(linkFor("My packs")).toHaveAttribute("href", "/auth");
    expect(linkFor("Create")).toHaveAttribute("href", "/auth");
    expect(linkFor("Profile")).toHaveAttribute("href", "/auth");
    expect(linkFor("Browse")).toHaveAttribute("href", "/");
    expect(linkFor("Suggestions")).toHaveAttribute("href", "/feedback");
  });

  it("marks the tab matching the current path as current", () => {
    mockAuth("authenticated");
    render(<MobileBottomNav />);
    // usePathname is mocked to "/", so Browse is current.
    expect(linkFor("Browse")).toHaveAttribute("aria-current", "page");
    expect(linkFor("Create")).not.toHaveAttribute("aria-current");
  });

  it("gives the emphasized Create tab an accessible name even though its text label is hidden", () => {
    mockAuth("authenticated");
    render(<MobileBottomNav />);
    const create = linkFor("Create");
    expect(create).toHaveAttribute("aria-label", "Create");
    // Only the icon wrapper span — no second span carrying visible text.
    expect(create.children).toHaveLength(1);
  });
});
