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
 * ⚠️ KEEP THIS CURRENT. Add a user-facing bullet here whenever a feature or
 * notable fix ships — do it in the SAME change that ships the feature, so the
 * changelog never lags behind. Add bullets to the current unreleased version's
 * entry; start a new entry only when a new version is cut. Write plain, benefit-
 * first copy (what the player can now do), not internal/task language.
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
    date: "2026-07-20",
    version: "1.4.0",
    title: "Edit your items, and a much faster Velanto",
    bullets: [
      "Paste a YouTube link with a timecode and the video starts right there, so you can point at the exact moment instead of the whole upload.",
      "Click any item you've added to a pool to edit it in place — fix a typo, swap the image, or change its format without deleting and starting over. What you've typed carries across if you switch between text, link, and image.",
      "Publish a draft straight from its page with a new Submit for review button, instead of opening the editor first.",
      "Velanto is dramatically faster to sign in and browse — pages that used to strain the server now load in a fraction of the time.",
      "Fixed being logged out at random, especially with several tabs open.",
      "Images you upload while building a pack are now kept for a day instead of two hours, so an interrupted evening's work doesn't lose them.",
      "Pack and profile link previews now load their image reliably when shared, instead of sometimes falling back to a plain card.",
    ],
  },
  {
    date: "2026-07-19",
    version: "1.3.0",
    title: "Drafts, My packs, and finding friends",
    bullets: [
      "Save a pack as a private draft and keep working on it — drafts skip review and stay visible only to you until you choose to publish.",
      "A new My packs tab gathers everything you've made — drafts, pending, published, and rejected — with a filter for each, and your pack's status now shows on its page.",
      "Find people by username with the new People tab, and follow them right from the results.",
      "When you add an image to a pack, you now preview it in the exact 16:9 frame the game uses — and can adjust the crop to reframe it if you don't like the fit.",
      "Result-share links are now short and tidy, no matter how big the pack.",
      "Notifications got a cleaner look with clearer grouping of what's new.",
      "Following someone back now updates instantly, without needing a refresh.",
      "Comment authors now show their avatar next to their name.",
      "Pack and profile link previews now show their image when shared in Telegram, Discord, and other apps.",
      "Fixed average-position stats on ranked packs, which could read low or show zero.",
    ],
  },
  {
    date: "2026-07-19",
    version: "1.2.0",
    title: "Follow people and faster sign-up",
    bullets: [
      "See who follows you and who you follow — follower and following lists open right from any profile.",
      "Sign up in one step with just an email, a username, and a password.",
      "Versus packs can now change the matchup every round — pit two different pools, or run a single pool against itself so the same set faces off in fresh, no-repeat head-to-heads.",
      "Comment sections now load with a placeholder instead of a spinner.",
      "Hover a commenter's name to peek at their mini-profile and follow them without leaving the page.",
      "Fixed the preview cards shown when you share a pack or a profile link.",
      "Added this Updates page so you can keep track of what's new.",
    ],
  },
  {
    date: "2026-07-18",
    version: "1.1.0",
    title: "Sign in with Discord and Google",
    bullets: [
      "One-tap sign-in with your Discord or Google account — no password to remember.",
      "Link Discord or Google to an existing account from Settings.",
      "Change your username any time from Settings.",
    ],
  },
  {
    date: "2026-07-17",
    version: "1.0.0",
    title: "Velanto is live",
    bullets: [
      "Build elimination-quiz packs in five formats and play them head-to-head with the community.",
      "Discover packs by search, tags, and popularity, and follow the authors you like.",
      "Comment on packs, vote, and report anything that breaks the community rules.",
      "Available in eleven languages.",
    ],
  },
];
