import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { SidebarContent } from "./AppSidebar";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

let authState: { status: string; user: { id: string } | null } = {
  status: "authenticated",
  user: { id: "u1" },
};
vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: () => authState }));

let rooms: Array<{
  id: string;
  packTitle: string;
  players: Array<{ username: string; avatarKey: string | null }>;
}> = [];
vi.mock("@/src/features/friends-rooms/friends-rooms-presence-context", () => ({
  useFriendsRoomsPresence: () => ({ rooms }),
}));

function renderSidebar(props: { collapsed?: boolean } = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SidebarContent {...props} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  pathname = "/";
  authState = { status: "authenticated", user: { id: "u1" } };
  rooms = [];
});

describe("SidebarContent", () => {
  it("renders the reachable nav destinations with their hrefs", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "My packs" })).toHaveAttribute(
      "href",
      "/my-packs",
    );
    expect(screen.getByRole("link", { name: "People" })).toHaveAttribute(
      "href",
      "/people",
    );
    expect(screen.getByRole("link", { name: "Rules" })).toHaveAttribute(
      "href",
      "/rules",
    );
  });

  it("marks the active destination via aria-current from the pathname", () => {
    pathname = "/";
    const { rerender } = renderSidebar();
    expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Rules" })).not.toHaveAttribute(
      "aria-current",
    );

    pathname = "/rules";
    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SidebarContent />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: "Rules" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Browse" })).not.toHaveAttribute(
      "aria-current",
    );

    // People is its own route now; Browse (`/` exactly) must NOT light up on it.
    pathname = "/people";
    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SidebarContent />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: "People" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Browse" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renders not-yet-built destinations as disabled 'Soon' items, not links", () => {
    renderSidebar();
    expect(screen.queryByRole("link", { name: /History/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Suggestions/ })).toBeNull();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Suggestions")).toBeInTheDocument();
    expect(screen.getAllByText("Soon")).toHaveLength(2);
  });

  it("routes the auth-gated destination to /auth when signed out", () => {
    authState = { status: "unauthenticated", user: null };
    renderSidebar();
    expect(screen.getByRole("link", { name: "My packs" })).toHaveAttribute(
      "href",
      "/auth",
    );
  });

  it("shows the room pill (with real lobby count) only when in a room", () => {
    // No rooms → no pill.
    const { unmount } = renderSidebar();
    expect(screen.queryByText("Rejoin")).toBeNull();
    unmount();

    rooms = [
      {
        id: "r1",
        packTitle: "Anime Night",
        players: [
          { username: "a", avatarKey: null },
          { username: "b", avatarKey: null },
        ],
      },
    ];
    renderSidebar();
    expect(screen.getByRole("link", { name: /Anime Night/ })).toHaveAttribute(
      "href",
      "/rooms/r1",
    );
    expect(screen.getByText("Lobby · 2")).toBeInTheDocument();
    expect(screen.getByText("Rejoin")).toBeInTheDocument();
  });

  it("collapsed rail hides visible labels but keeps accessible names", () => {
    rooms = [
      {
        id: "r1",
        packTitle: "Anime Night",
        players: [{ username: "a", avatarKey: null }],
      },
    ];
    renderSidebar({ collapsed: true });
    // Brand wordmark and text labels are visually removed.
    expect(screen.queryByText("VELANTO")).toBeNull();
    expect(screen.queryByText("Browse")).toBeNull();
    // …but the link is still reachable by its accessible name.
    expect(screen.getByRole("link", { name: "Browse" })).toBeInTheDocument();
    // The room pill is dropped from the collapsed rail.
    expect(screen.queryByText("Rejoin")).toBeNull();
  });
});
