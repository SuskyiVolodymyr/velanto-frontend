import { describe, expect, it, beforeEach } from "vitest";
import { getStoredAccent, setStoredAccent } from "./theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty("--acc");
});

describe("theme", () => {
  it("returns null when nothing is stored", () => {
    expect(getStoredAccent()).toBeNull();
  });

  it("setStoredAccent persists the color and returns it via getStoredAccent", () => {
    setStoredAccent("#7c8cff");
    expect(getStoredAccent()).toBe("#7c8cff");
  });

  it("setStoredAccent applies the color to the --acc CSS custom property", () => {
    setStoredAccent("#39d98a");
    expect(document.documentElement.style.getPropertyValue("--acc")).toBe("#39d98a");
  });
});
