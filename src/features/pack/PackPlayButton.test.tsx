import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("blocks a signed-out viewer with a reason tooltip instead of a link", async () => {
    mockStatus("unauthenticated");
    render(<PackPlayButton packId="p1" />);

    // No navigable link — a blocked button that can't start a play.
    expect(screen.queryByRole("link", { name: /play now/i })).toBeNull();
    const button = screen.getByRole("button", { name: /play now/i });
    expect(button).toHaveAttribute("aria-disabled", "true");

    await userEvent.hover(button);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Log in to play");
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
