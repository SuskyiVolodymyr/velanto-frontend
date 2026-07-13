import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PackPlayButton } from "./PackPlayButton";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/auth-context");

const mockedUseAuth = vi.mocked(useAuth);

function mockStatus(status: "loading" | "authenticated" | "unauthenticated") {
  mockedUseAuth.mockReturnValue({
    user:
      status === "authenticated"
        ? {
            id: "u1",
            email: "a@x.com",
            username: "a",
            role: "user",
            createdAt: "",
          }
        : null,
    status,
    login: vi.fn(),
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

beforeEach(() => vi.resetAllMocks());

describe("PackPlayButton", () => {
  it("links straight to the play route for a signed-in viewer", () => {
    mockStatus("authenticated");
    render(<PackPlayButton packId="p1" />);
    expect(screen.getByRole("link", { name: /play now/i })).toHaveAttribute(
      "href",
      "/packs/p1/play",
    );
  });

  it("links to the play route for a signed-out viewer too (anon can play)", () => {
    mockStatus("unauthenticated");
    render(<PackPlayButton packId="p1" />);

    // Anyone can play — signed-out plays just aren't recorded — so it's a link,
    // not a blocked button.
    expect(screen.getByRole("link", { name: /play now/i })).toHaveAttribute(
      "href",
      "/packs/p1/play",
    );
    expect(screen.queryByRole("button", { name: /play now/i })).toBeNull();
  });

  it("still links while auth is resolving (no login flash)", () => {
    mockStatus("loading");
    render(<PackPlayButton packId="p1" />);
    expect(screen.getByRole("link", { name: /play now/i })).toHaveAttribute(
      "href",
      "/packs/p1/play",
    );
  });
});
