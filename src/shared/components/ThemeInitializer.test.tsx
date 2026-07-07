import { describe, expect, it, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { ThemeInitializer } from "./ThemeInitializer";
import * as theme from "@/src/shared/lib/theme";

beforeEach(() => {
  document.documentElement.style.removeProperty("--acc");
  vi.restoreAllMocks();
});

describe("ThemeInitializer", () => {
  it("applies a stored accent to the document root on mount", () => {
    vi.spyOn(theme, "getStoredAccent").mockReturnValue("#f5a623");
    render(<ThemeInitializer />);
    expect(document.documentElement.style.getPropertyValue("--acc")).toBe("#f5a623");
  });

  it("does nothing when no accent is stored", () => {
    vi.spyOn(theme, "getStoredAccent").mockReturnValue(null);
    render(<ThemeInitializer />);
    expect(document.documentElement.style.getPropertyValue("--acc")).toBe("");
  });

  it("renders no visible output", () => {
    const { container } = render(<ThemeInitializer />);
    expect(container).toBeEmptyDOMElement();
  });
});
