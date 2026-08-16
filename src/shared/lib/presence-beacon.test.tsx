import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import {
  BEACON_INTERVAL_MS,
  usePresenceBeacon,
} from "@/src/shared/lib/presence-beacon";
import { apiClient } from "@/src/shared/lib/api-client";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: { post: vi.fn() },
}));
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: vi.fn(),
}));

function Probe() {
  usePresenceBeacon();
  return null;
}

/** Drive `document.visibilityState`, which is read-only by default. */
function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

const beacons = () => vi.mocked(apiClient.post).mock.calls.length;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.mocked(apiClient.post).mockResolvedValue(undefined);
  vi.mocked(useAuth).mockReturnValue({
    status: "authenticated",
  } as ReturnType<typeof useAuth>);
  setVisibility("visible");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePresenceBeacon", () => {
  it("beacons immediately once auth has resolved", () => {
    render(<Probe />);

    expect(apiClient.post).toHaveBeenCalledWith("/presence");
  });

  // THE RULE THAT MATTERS MOST. The access token lives in memory only, so it is
  // null right after a page load. A beacon sent during `loading` would arrive
  // unauthenticated and count a signed-in reader as an anonymous visitor —
  // the double count that took four releases to kill.
  it("sends nothing while auth is still loading", () => {
    vi.mocked(useAuth).mockReturnValue({ status: "loading" } as ReturnType<
      typeof useAuth
    >);

    render(<Probe />);

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("beacons once auth resolves to signed-out", () => {
    vi.mocked(useAuth).mockReturnValue({
      status: "unauthenticated",
    } as ReturnType<typeof useAuth>);

    render(<Probe />);

    expect(apiClient.post).toHaveBeenCalledWith("/presence");
  });

  it("keeps beaconing on an interval while visible", () => {
    render(<Probe />);
    const initial = beacons();

    act(() => {
      vi.advanceTimersByTime(BEACON_INTERVAL_MS * 3);
    });

    expect(beacons()).toBe(initial + 3);
  });

  // A tab forgotten in a background window would otherwise count as a person
  // indefinitely.
  it("stops while the tab is hidden", () => {
    render(<Probe />);
    const beforeHiding = beacons();

    act(() => {
      setVisibility("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(BEACON_INTERVAL_MS * 5);
    });

    expect(beacons()).toBe(beforeHiding);
  });

  it("resumes as soon as the tab is visible again", () => {
    render(<Probe />);
    act(() => {
      setVisibility("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(BEACON_INTERVAL_MS * 2);
    });
    const whileHidden = beacons();

    act(() => {
      setVisibility("visible");
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(beacons()).toBe(whileHidden + 1);
  });

  // A page restored from the back/forward cache does not re-run effects, so a
  // mount-only beacon would let someone silently vanish by pressing Back.
  it("beacons again when a page is restored from the back/forward cache", () => {
    render(<Probe />);
    const onLoad = beacons();

    act(() => {
      window.dispatchEvent(new Event("pageshow"));
    });

    expect(beacons()).toBe(onLoad + 1);
  });

  it("stops beaconing once unmounted", () => {
    const view = render(<Probe />);
    const beforeUnmount = beacons();

    view.unmount();
    act(() => {
      vi.advanceTimersByTime(BEACON_INTERVAL_MS * 4);
    });

    expect(beacons()).toBe(beforeUnmount);
  });

  // Presence is observational. A blocked or failing beacon means the visitor
  // goes uncounted — never that anything surfaces to them.
  it("swallows a failing beacon", () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("blocked"));

    expect(() => render(<Probe />)).not.toThrow();
  });
});
