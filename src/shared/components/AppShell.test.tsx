import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { AppShell } from "./AppShell";
import { useSidebar } from "@/src/shared/lib/sidebar-context";
import { usePlayFocus } from "@/src/shared/lib/play-focus-context";

/** Stands in for a page's PageHeader toggle: any descendant can flip the rail. */
/** Stands in for RoomScreen, which declares focus from inside the shell. */
function PlayFocusProbe({ active }: { active: boolean }) {
  usePlayFocus(active);
  return <div>content</div>;
}

function SidebarToggleProbe() {
  const { toggle } = useSidebar();
  return (
    <button type="button" onClick={toggle}>
      toggle
    </button>
  );
}

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
  AppSidebar: ({ collapsed }: { collapsed: boolean }) => (
    <div data-testid="app-sidebar" data-collapsed={String(collapsed)} />
  ),
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
  SiteFooter: () => <div data-testid="site-footer" />,
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

  it("keeps the sidebar rail on every other route, but collapsed by default", () => {
    pathname.current = "/people";
    renderShell(<div>content</div>);
    expect(screen.getByTestId("app-sidebar")).toHaveAttribute(
      "data-collapsed",
      "true",
    );
  });

  it("starts the rail expanded on the dashboard", () => {
    renderShell(<div>content</div>);
    expect(screen.getByTestId("app-sidebar")).toHaveAttribute(
      "data-collapsed",
      "false",
    );
  });

  // The global top bar stays dashboard-only: pages off the dashboard own their
  // own sticky header, and stacking the bar above one produced a double header.
  // The rail's toggle therefore lives in PageHeader, not here.
  it("still drops the global top bar on every other route", () => {
    pathname.current = "/people";
    renderShell(<div>content</div>);
    expect(screen.queryByTestId("app-topbar")).not.toBeInTheDocument();
  });

  // Once the user states a preference it follows them across routes, rather
  // than snapping back to the per-route default on every navigation.
  it("lets a route's default be overridden, and keeps that choice across navigation", async () => {
    const user = userEvent.setup();
    pathname.current = "/people";
    const { rerender } = renderShell(<SidebarToggleProbe />);
    await user.click(screen.getByRole("button", { name: /toggle/i }));
    expect(screen.getByTestId("app-sidebar")).toHaveAttribute(
      "data-collapsed",
      "false",
    );

    pathname.current = "/rules";
    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AppShell>
          <SidebarToggleProbe />
        </AppShell>
      </NextIntlClientProvider>,
    );
    expect(screen.getByTestId("app-sidebar")).toHaveAttribute(
      "data-collapsed",
      "false",
    );
  });

  // The pack authoring surface keeps its pre-2.1.0 dashboard-only behaviour:
  // a focused editor, no rail. Both routes render the same CreatePackForm.
  it.each(["/create", "/packs/abc123/edit"])(
    "renders no rail on the authoring route %s",
    (path) => {
      pathname.current = path;
      renderShell(<div>content</div>);
      expect(screen.queryByTestId("app-sidebar")).not.toBeInTheDocument();
      expect(screen.getByText("content")).toBeInTheDocument();
    },
  );

  // Playing is a focused surface: a round owns the whole width, and the rail
  // is navigation you are not meant to be using mid-round.
  it("renders no rail on the solo play screen", () => {
    pathname.current = "/packs/abc123/play";
    renderShell(<div>content</div>);
    expect(screen.queryByTestId("app-sidebar")).not.toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("keeps the rail on the result screen, which is a reading page", () => {
    // You are done playing there and the next thing you want is to go
    // somewhere else.
    pathname.current = "/packs/abc123/result";
    renderShell(<div>content</div>);
    expect(screen.getByTestId("app-sidebar")).toBeInTheDocument();
  });

  // A live room plays AND shows its results at the same url, so no path test
  // can separate them — the page says which it is.
  it("drops the rail while a page declares itself mid-play", () => {
    pathname.current = "/rooms/room-1";
    renderShell(<PlayFocusProbe active />);
    expect(screen.queryByTestId("app-sidebar")).not.toBeInTheDocument();
  });

  it("keeps the rail on that same url once the page stops asking", () => {
    pathname.current = "/rooms/room-1";
    renderShell(<PlayFocusProbe active={false} />);
    expect(screen.getByTestId("app-sidebar")).toBeInTheDocument();
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

  it("shows the site footer on the dashboard route", () => {
    renderShell(<div>content</div>);
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
  });

  it("shows the site footer on every other chromed route too", () => {
    pathname.current = "/people";
    renderShell(<div>content</div>);
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
  });

  it.each(["/create", "/packs/abc123/edit"])(
    "hides the site footer on the authoring route %s",
    (path) => {
      pathname.current = path;
      renderShell(<div>content</div>);
      expect(screen.queryByTestId("site-footer")).not.toBeInTheDocument();
    },
  );

  it("hides the site footer on the full-screen /auth route", () => {
    pathname.current = "/auth";
    renderShell(<div>auth content</div>);
    expect(screen.queryByTestId("site-footer")).not.toBeInTheDocument();
  });
});
