import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PageHeader } from "./PageHeader";

// PageHeader now renders HeaderUserCluster (the notifications bell + account
// popup), which calls useAuth. Stubbed signed-out here rather than mounting a
// real AuthProvider, which would fire the on-mount POST /auth/refresh these
// tests have no business making — and pinning it keeps the header's two
// states explicit instead of leaning on useAuth's no-provider fallback.
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ user: null, status: "unauthenticated", logout: vi.fn() }),
}));

describe("PageHeader", () => {
  it("renders a back pill linking to the given href with the given label", () => {
    render(<PageHeader back={{ href: "/", label: "Browse" }} />);

    const link = screen.getByRole("link", { name: "Browse" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders the brand mark linking home with the VELANTO wordmark", () => {
    render(<PageHeader brand crumb="Admin" />);

    const link = screen.getByRole("link", { name: "Velanto" });
    expect(link).toHaveAttribute("href", "/");
    expect(screen.getByText("VELANTO")).toBeInTheDocument();
  });

  it("shows a '/' separator between the brand and the crumb, but not between a back pill and a crumb", () => {
    const { unmount } = render(<PageHeader brand crumb="Admin" />);
    expect(screen.getByText("/")).toBeInTheDocument();
    unmount();

    render(
      <PageHeader
        back={{ href: "/moderation", label: "Queue" }}
        crumb="Report #42"
      />,
    );
    expect(screen.queryByText("/")).not.toBeInTheDocument();
    expect(screen.getByText("Report #42")).toBeInTheDocument();
  });

  it("renders badge and meta content next to the crumb", () => {
    render(
      <PageHeader
        brand
        crumb="Moderation"
        badge={<span>STAFF</span>}
        meta={<span data-testid="meta">#123</span>}
      />,
    );

    expect(screen.getByText("STAFF")).toBeInTheDocument();
    expect(screen.getByTestId("meta")).toBeInTheDocument();
  });

  it("renders trailing content right-aligned", () => {
    render(
      <PageHeader
        back={{ href: "/", label: "Browse" }}
        trailing={<button type="button">New suggestion</button>}
      />,
    );

    expect(
      screen.getByRole("button", { name: "New suggestion" }),
    ).toBeInTheDocument();
  });

  it("is a full-width sticky header, not capped to the reading column", () => {
    render(<PageHeader back={{ href: "/", label: "Browse" }} />);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("sticky", "top-0");
    expect(header.className).not.toMatch(/mx-auto|max-w-/);
  });
});
