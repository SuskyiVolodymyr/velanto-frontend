import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { AppearanceSection } from "./AppearanceSection";
import * as theme from "@/src/shared/lib/theme";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("AppearanceSection", () => {
  it("renders 4 accent swatches with the default active", () => {
    render(<AppearanceSection />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(
      screen.getByRole("button", { name: "Use accent color #00e5ff" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking a swatch calls setStoredAccent with that color and updates the active swatch", async () => {
    const user = userEvent.setup();
    const setStoredAccentSpy = vi.spyOn(theme, "setStoredAccent");
    render(<AppearanceSection />);

    await user.click(
      screen.getByRole("button", { name: "Use accent color #7c8cff" }),
    );

    expect(setStoredAccentSpy).toHaveBeenCalledWith("#7c8cff");
    expect(
      screen.getByRole("button", { name: "Use accent color #7c8cff" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Use accent color #00e5ff" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects a previously-stored accent as active on mount", () => {
    vi.spyOn(theme, "getStoredAccent").mockReturnValue("#39d98a");
    render(<AppearanceSection />);

    expect(
      screen.getByRole("button", { name: "Use accent color #39d98a" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
