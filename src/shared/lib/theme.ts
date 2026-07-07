const ACCENT_STORAGE_KEY = "velanto:accent";

export function getStoredAccent(): string | null {
  try {
    return localStorage.getItem(ACCENT_STORAGE_KEY);
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
