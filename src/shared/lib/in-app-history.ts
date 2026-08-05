const KEY = "velanto:previous-path";

/**
 * The page navigated away from most recently, within this tab.
 *
 * Session-scoped, because that is the scope of the question it answers: a fresh
 * tab has no in-app previous page, so a visitor arriving on a shared link gets
 * a back control pointing at its own fixed fallback. It survives a reload on
 * purpose — reloading a page does not change where you came from.
 *
 * Only the immediately previous entry is kept, not a stack. A back control
 * moves one step, and keeping a deeper record honest across `popstate` is
 * bookkeeping nothing would read.
 *
 * sessionStorage access is wrapped: it throws outright with site data blocked,
 * and chrome must not take the page down.
 */
export function setPreviousPath(path: string): void {
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // Storage unavailable — back controls use their fixed fallback.
  }
}

export function getPreviousPath(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
