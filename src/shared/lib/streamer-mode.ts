const STREAMER_MODE_STORAGE_KEY = "velanto:streamer-mode";

/** Attribute set on <html> — by the init script pre-paint and by
 *  {@link setStoredStreamerMode} at runtime — so CSS can hide identity content
 *  before hydration. Value "on" means streamer mode is active. */
export const STREAMER_MODE_ATTR = "data-streamer-mode";

/** Marker the provider stamps on <html> once React controls rendering,
 *  switching off the blunt pre-hydration hide rule in globals.css. */
export const STREAMER_MODE_HYDRATED_ATTR = "data-streamer-hydrated";

export function getStoredStreamerMode(): boolean {
  try {
    return localStorage.getItem(STREAMER_MODE_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function setStoredStreamerMode(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(STREAMER_MODE_STORAGE_KEY, "on");
    } else {
      localStorage.removeItem(STREAMER_MODE_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (e.g. private browsing) — the setting still
    // applies for this session, it just won't persist across reloads.
  }
  if (typeof document !== "undefined") {
    if (enabled) {
      document.documentElement.setAttribute(STREAMER_MODE_ATTR, "on");
    } else {
      document.documentElement.removeAttribute(STREAMER_MODE_ATTR);
    }
  }
}

/**
 * A blocking script (inlined into <head>, not a user-content string — only our
 * own storage key, JSON-serialized, flows into it) that stamps
 * `data-streamer-mode="on"` on <html> before first paint when streamer mode is
 * stored on. Paired with the globals.css rule that hides `[data-streamer-hideable]`
 * content while that attribute is present and `data-streamer-hydrated` is not,
 * this guarantees a streamer never sees a real name/avatar/comment for even one
 * frame on reload — a post-hydration effect would apply a frame too late.
 */
export function getStreamerModeInitScript(): string {
  const key = JSON.stringify(STREAMER_MODE_STORAGE_KEY);
  return `(function(){try{if(localStorage.getItem(${key})==="on"){document.documentElement.setAttribute("${STREAMER_MODE_ATTR}","on");}}catch(e){}})();`;
}
