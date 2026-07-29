import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { AppShell } from "./AppShell";

// MobileDrawer (rendered alongside AppSidebar on the dashboard route) reads
// `shell.nav.label` via useTranslations, and the collapse-tracking effects
// query the viewport — jsdom doesn't implement matchMedia at all.
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

function renderShell(children: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AppShell>{children}</AppShell>
    </NextIntlClientProvider>,
  );
}

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

vi.mock("@/src/shared/components/AppSidebar", () => ({
  AppSidebar: () => <div data-testid="app-sidebar" />,
  SidebarContent: () => <div data-testid="sidebar-content" />,
}));

vi.mock("@/src/shared/components/AppTopBar", () => ({
  AppTopBar: ({ onMenuToggle }: { onMenuToggle: () => void }) => (
    <div data-testid="app-topbar" data-has-menu-toggle={!!onMenuToggle} />
  ),
}));

vi.mock("@/src/shared/components/BannedBanner", () => ({
  BannedBanner: () => null,
}));
vi.mock("@/src/shared/components/SiteFooter", () => ({
  SiteFooter: () => null,
}));
vi.mock("@/src/shared/components/MobileBottomNav", () => ({
  MobileBottomNav: () => <div data-testid="mobile-bottom-nav" />,
}));
vi.mock("@/src/features/friends-rooms/RoomPresenceIndicator", () => ({
  RoomPresenceIndicator: () => <div data-testid="room-presence" />,
}));

beforeEach(() => {
  pathname.current = "/";
});

describe("AppShell", () => {
  it("shows the sidebar rail on the dashboard route, with the menu toggle wired up", () => {
    renderShell(<div>content</div>);
    expect(screen.getByTestId("app-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("app-topbar")).toHaveAttribute(
      "data-has-menu-toggle",
      "true",
    );
  });

  it("drops the sidebar rail AND the global top bar on every other route — pages own their own header", () => {
    pathname.current = "/people";
    renderShell(<div>content</div>);
    expect(screen.queryByTestId("app-sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("app-topbar")).not.toBeInTheDocument();
  });

  it("renders no chrome at all on the full-screen /auth route", () => {
    pathname.current = "/auth";
    renderShell(<div>auth content</div>);
    expect(screen.queryByTestId("app-topbar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("app-sidebar")).not.toBeInTheDocument();
    expect(screen.getByText("auth content")).toBeInTheDocument();
  });

  it("still renders children (with no global chrome) on non-dashboard routes", () => {
    pathname.current = "/rules";
    renderShell(<div>rules content</div>);
    expect(screen.getByText("rules content")).toBeInTheDocument();
    expect(screen.queryByTestId("app-topbar")).not.toBeInTheDocument();
  });
});
