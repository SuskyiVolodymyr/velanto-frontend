import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { DocsScreen } from "./DocsScreen";
import messages from "@/messages/en.json";

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

/**
 * The docs describe how the product behaves, so a behaviour change can falsify
 * them silently — no test fails, the page still renders, the sentence is just
 * a lie. That is exactly what happened to `statsAnonNote` (#220): it correctly
 * said anonymous plays weren't recorded, then #221 made them recorded and
 * nobody came back here.
 *
 * These pin the two claims most likely to rot, against the behaviour that
 * makes them true. They are deliberately about MEANING, not wording — a
 * rewrite that keeps the facts should pass.
 */
describe("docs claims that track behaviour", () => {
  it("does not claim anonymous plays go unrecorded (#221 made them count)", () => {
    const note = messages.docs.statsAnonNote.toLowerCase();

    // The old copy: "Only plays from signed-in accounts are recorded... it
    // won't count toward a pack's stats."
    expect(note).not.toMatch(/only plays from signed-in/);
    expect(note).not.toMatch(/won'?t count toward/);
    // What is true now: the play counts, it just isn't tied to the account.
    expect(note).toMatch(/counts toward/);
  });

  it("still says the stats are gated on finishing (#222 enforces it)", () => {
    // This one is TRUE and must stay — #222 made ResultScreen gate the
    // breakdown on evidence of a play, so the promise is now backed by code.
    expect(messages.docs.compareCardBody.toLowerCase()).toMatch(
      /once you'?ve finished/,
    );
  });
});
