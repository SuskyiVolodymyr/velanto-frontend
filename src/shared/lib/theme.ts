const ACCENT_STORAGE_KEY = "velanto:accent";

export const DEFAULT_ACCENT = "#00e5ff";
export const ACCENTS = [
  DEFAULT_ACCENT,
  "#7c8cff",
  "#39d98a",
  "#f5a623",
] as const;

function isValidAccent(value: string): boolean {
  return (ACCENTS as readonly string[]).includes(value);
}

export function getStoredAccent(): string | null {
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    return stored && isValidAccent(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function setStoredAccent(color: string): void {
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, color);
  } catch {
    // localStorage unavailable (e.g. private browsing) — the color still
    // applies for this session, it just won't persist across reloads.
  }
  document.documentElement.style.setProperty("--acc", color);
}

/**
 * A blocking script (inlined into <head>, not a user-content string — no
 * external/user input flows into it, only our own storage key + accent
 * whitelist, both JSON-serialized) that applies a stored accent before first
 * paint. A post-hydration useEffect can't do this: it would apply the
 * accent one frame after the CSS default already painted, producing a
 * visible flash of the wrong color on every reload.
 */
export function getThemeInitScript(): string {
  const key = JSON.stringify(ACCENT_STORAGE_KEY);
  const valid = JSON.stringify(ACCENTS);
  return `(function(){try{var s=localStorage.getItem(${key});var v=${valid};if(s&&v.indexOf(s)!==-1){document.documentElement.style.setProperty("--acc",s);}}catch(e){}})();`;
}
