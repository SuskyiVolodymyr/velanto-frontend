import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { StreamerModeProvider, useStreamerMode } from "./streamer-mode-context";

const STORAGE_KEY = "velanto:streamer-mode";

function wrapper({ children }: { children: ReactNode }) {
  return <StreamerModeProvider>{children}</StreamerModeProvider>;
}

function renderStreamerMode() {
  return renderHook(() => useStreamerMode(), { wrapper });
}

describe("useStreamerMode", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-streamer-mode");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-streamer-mode");
  });

  it("defaults to disabled with nothing stored", () => {
    const { result } = renderStreamerMode();
    expect(result.current.enabled).toBe(false);
  });

  it("reads the persisted value on mount", () => {
    localStorage.setItem(STORAGE_KEY, "on");
    const { result } = renderStreamerMode();
    expect(result.current.enabled).toBe(true);
  });

  it("persists the flag to localStorage and the <html> attribute when enabled", () => {
    const { result } = renderStreamerMode();
    act(() => result.current.setEnabled(true));
    expect(result.current.enabled).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("on");
    expect(document.documentElement.getAttribute("data-streamer-mode")).toBe("on");
  });

  it("clears persistence when disabled", () => {
    localStorage.setItem(STORAGE_KEY, "on");
    const { result } = renderStreamerMode();
    act(() => result.current.setEnabled(false));
    expect(result.current.enabled).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(document.documentElement.hasAttribute("data-streamer-mode")).toBe(false);
  });

  it("toggle flips the current value", () => {
    const { result } = renderStreamerMode();
    expect(result.current.enabled).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(false);
  });

  it("reveals items individually by id", () => {
    const { result } = renderStreamerMode();
    act(() => result.current.setEnabled(true));
    expect(result.current.isRevealed("a")).toBe(false);
    act(() => result.current.reveal("a"));
    expect(result.current.isRevealed("a")).toBe(true);
    // Revealing one item does not reveal another.
    expect(result.current.isRevealed("b")).toBe(false);
  });

  it("resets per-item reveals when streamer mode is toggled off", () => {
    const { result } = renderStreamerMode();
    act(() => result.current.setEnabled(true));
    act(() => result.current.reveal("a"));
    expect(result.current.isRevealed("a")).toBe(true);

    act(() => result.current.setEnabled(false));
    act(() => result.current.setEnabled(true));
    // The revealed set is in-memory and cleared on every toggle.
    expect(result.current.isRevealed("a")).toBe(false);
  });

  it("throws when used outside a provider", () => {
    // Silence React's error boundary noise for the expected throw.
    expect(() => renderHook(() => useStreamerMode())).toThrow(/StreamerModeProvider/);
  });
});
