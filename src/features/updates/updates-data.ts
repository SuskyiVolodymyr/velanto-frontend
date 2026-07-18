export interface UpdateEntry {
  /** Locale-neutral release date, e.g. "2026-07-18". Sorted on, so keep it ISO. */
  date: string;
  /** Version this update shipped in, e.g. "1.1.0". Rendered as `v{version}`. */
  version: string;
  /** Short English headline. */
  title: string;
  /** English bullet points describing what changed. */
  bullets: string[];
}

/**
 * The public changelog, authored newest-first.
 *
 * Entry copy lives here rather than in the i18n catalogs on purpose: the
 * catalogs test forbids any string identical to its English source, and this is
 * prose we don't machine-translate (same treatment as the in-repo docs content).
 * The page chrome — heading, intro, empty state — IS translated and lives in the
 * `updates` namespace. `UpdatesScreen` re-sorts by date, so the order here is a
 * convenience, not a contract.
 */
export const UPDATES: UpdateEntry[] = [
  {
    date: "2026-07-18",
    version: "1.1.0",
    title: "Sign in with Discord and Google",
    bullets: [
      "One-tap sign-in with your Discord or Google account — no password to remember.",
      "Change your username any time from Settings.",
    ],
  },
  {
    date: "2026-07-17",
    version: "1.0.0",
    title: "Velanto is live",
    bullets: [
      "Build elimination-quiz packs in five formats and play them with the community.",
      "Discover packs by search, tags, and popularity, and follow the authors you like.",
    ],
  },
];
