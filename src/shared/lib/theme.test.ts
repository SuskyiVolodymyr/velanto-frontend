import { describe, expect, it, beforeEach } from "vitest";
import { ACCENTS, getStoredAccent, getThemeInitScript, setStoredAccent } from "./theme";

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

  it("getStoredAccent rejects a value outside the known accent list", () => {
    localStorage.setItem("velanto:accent", "javascript:alert(1)");
    expect(getStoredAccent()).toBeNull();
  });
});

describe("getThemeInitScript", () => {
  it("embeds the storage key and the full accent whitelist", () => {
    const script = getThemeInitScript();
    expect(script).toContain("velanto:accent");
    for (const accent of ACCENTS) {
      expect(script).toContain(accent);
    }
  });
});
