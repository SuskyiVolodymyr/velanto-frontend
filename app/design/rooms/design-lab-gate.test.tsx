import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notFound } from "next/navigation";
import DesignRoomBetweenPage from "./between/page";
import DesignRoomGuessingPage from "./guessing/page";
import DesignRoomResultsPage from "./results/page";

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
// The screens pull in the whole room surface (sockets, next-intl, media). This
// suite is about REACHABILITY, not what the lab renders, so they are stubbed —
// `mock-room.test.ts` is what covers the fixtures themselves.
vi.mock("@/src/features/design-lab/DesignRoomBetweenScreen", () => ({
  DesignRoomBetweenScreen: () => <div>between</div>,
}));
vi.mock("@/src/features/design-lab/DesignRoomGuessingScreen", () => ({
  DesignRoomGuessingScreen: () => <div>guessing</div>,
}));
vi.mock("@/src/features/design-lab/DesignRoomResultsScreen", () => ({
  DesignRoomResultsScreen: () => <div>results</div>,
}));

const PAGES = [
  ["between", DesignRoomBetweenPage],
  ["guessing", DesignRoomGuessingPage],
  ["results", DesignRoomResultsPage],
] as const;

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

/**
 * The design lab is internal tooling with no link into it from the app, but it
 * is an ordinary App Router route: it builds into the production bundle and is
 * reachable by anyone who types the URL.
 *
 * `robots: { index: false }` and the `/design/` disallow in app/robots.ts keep
 * it out of SEARCH RESULTS — that is discovery, not access, and the two were
 * easy to mistake for each other.
 */
describe("design lab reachability", () => {
  it.each(PAGES)("serves /design/rooms/%s outside production", (_name, Page) => {
    vi.stubEnv("NODE_ENV", "development");

    Page();

    expect(vi.mocked(notFound)).not.toHaveBeenCalled();
  });

  it.each(PAGES)("404s /design/rooms/%s in production", (_name, Page) => {
    vi.stubEnv("NODE_ENV", "production");

    Page();

    expect(vi.mocked(notFound)).toHaveBeenCalled();
  });
});
