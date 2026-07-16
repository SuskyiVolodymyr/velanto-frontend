import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { DocsScreen } from "./DocsScreen";

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/docs",
  useSearchParams: () => searchParams,
}));

// The manager has its own tests; here we only care that the API topic mounts it.
vi.mock("./ApiTokensSection", () => ({
  ApiTokensSection: () => <div data-testid="api-tokens-section" />,
}));

describe("DocsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
  });

  it("opens the getting-started topic when no topic is in the URL", () => {
    render(<DocsScreen />);
    expect(
      screen.getByRole("heading", { name: /what is velanto/i }),
    ).toBeInTheDocument();
  });

  // Settings links straight at ?topic=api, so the URL has to drive the tab.
  it("opens the API topic when the URL asks for it", () => {
    searchParams = new URLSearchParams("topic=api");
    render(<DocsScreen />);

    expect(
      screen.getByRole("heading", { name: /api & tokens/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("api-tokens-section")).toBeInTheDocument();
  });

  it("falls back to getting started when the URL topic is unknown", () => {
    searchParams = new URLSearchParams("topic=nonsense");
    render(<DocsScreen />);
    expect(
      screen.getByRole("heading", { name: /what is velanto/i }),
    ).toBeInTheDocument();
  });

  it("puts the chosen topic in the URL so the tab survives a refresh", async () => {
    const user = userEvent.setup();
    render(<DocsScreen />);

    await user.click(screen.getByRole("button", { name: /api & tokens/i }));

    expect(replace).toHaveBeenCalledWith("/docs?topic=api", { scroll: false });
  });

  it("only mounts the token manager on the API topic", () => {
    render(<DocsScreen />);
    expect(screen.queryByTestId("api-tokens-section")).not.toBeInTheDocument();
  });
});
