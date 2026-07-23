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
    date: "2026-07-23",
    version: "1.8.0",
    title: "Save One with Friends",
    bullets: [
      "You can now play Save One together, live, with 2–4 friends in a room. Open a Save One with Friends pack, start a room, and share the code — or send the invite link — to pull everyone in.",
      "Every round shows one item per player plus one more, and each of you claims one to sacrifice. No two people can cut the same item, and the single item nobody sacrifices is the one that survives. There's no turn order and no timer — claim, change your mind, and argue it out in real time.",
      "Between rounds you see exactly who sacrificed what, and a Next counter shows how many players are ready before the room moves on. Your join code stays hidden until you reveal it, so sharing your screen never leaks your room.",
    ],
  },
  {
    date: "2026-07-22",
    version: "1.7.0",
    title: "A safer pack editor",
    bullets: [
      "Pressing Enter while editing a pack no longer publishes it. It used to submit the whole form from any field, so typing a title and hitting Enter out of habit sent a draft to review with no warning — and adding an item by keyboard did the same thing. Enter now does nothing in a single-line field; Publish and Save draft are the buttons that publish.",
      "Fixed the controls under a pack's rounds breaking across three lines and spilling out of their buttons when there was plenty of room beside them.",
    ],
  },
  {
    date: "2026-07-22",
    version: "1.6.0",
    title: "Random pools, Rank Blind polish, and a Back button that means it",
    bullets: [
      "A round can now draw its pool at random instead of you picking one. Choose Random pool on either side of a matchup and every play pairs different pools — a pack of 26 bands gives each player a different set of 13 matchups. A random pool is used once per play, never lands against itself, and the dropdown counts down how many you have left as you add rounds.",
      'Rounds you haven\'t named now read "Round 1", "Round 2" and so on, instead of borrowing the name of the pool they draw from. A round that picks its pool at random has no name to borrow, and naming half a pack\'s rounds while numbering the rest looked like a bug. Give a round its own name any time you want one.',
      "A Rank Blind pack's own page now shows its Podium finishes table, the way the other four formats show their Top picked one. It was only on the result screen, so you had to play a pack to see how its items had been placed.",
      "The recap you get between Rank Blind rounds is now the same card your result is made of, down to where each item came in the draw — so what you read mid-play matches what you keep at the end.",
      "Placing the last item in a Rank Blind pack takes you straight to your result, instead of stopping at a page telling you that you finished. The other four formats already did this.",
      'Fixed a video preview being replaced by "this video can\'t play here" seconds after it had started playing. YouTube reports errors on videos that then carry on playing fine, and we were taking every one of them at face value.',
      "Back now goes to one predictable place on every page — a result and a play screen return to the pack, a pack returns to the feed — instead of retracing however you happened to arrive. You can also middle-click it or open it in a new tab now, like any other link.",
    ],
  },
  {
    date: "2026-07-22",
    version: "1.5.0",
    title: "Every result screen rebuilt, draft limits, and faster browsing",
    bullets: [
      "1v1 results are rebuilt around the matchups you actually played: every pairing side by side, the one you picked in green and the one you dropped in red, with the share of players who picked each — for that exact pairing, not the pack as a whole. Each row also says how many players have seen that pairing, because most are decided by a handful of people and a lone 100% shouldn't read as a verdict.",
      "A Top picked table now ranks a versus pack's items by how often they win the matchups they turn up in, with the podium marked out. It's on the result screen and on the pack's own page, for both 1v1 and NxN.",
      "NxN results now replay the rounds you played: both sides with every item that was on them, the side you took in green and the one you dropped in red. There are no crowd percentages per matchup here on purpose — a side of eight against another side of eight almost never comes up twice, so any share would be one person's opinion dressed up as a statistic. The Top picked table is the honest version of that number.",
      "NxN scrolls back to the top of the next round when you confirm, so a tall matchup no longer drops you into the middle of the following one.",
      "Save One and Sacrifice One results now show each round as the full set of items you were shown, with the one you kept in green — or the one you gave up in red. Before, a result only remembered your pick and not what you chose it from.",
      "The Top picked table now covers those two formats as well, as Most saved or Most sacrificed. It counts how often an item survived the rounds it actually appeared in, rather than dividing by every play of the pack, so an item the shuffle rarely deals is no longer punished for turning up less often. Like the versus one, it shows on the pack's own page too.",
      "Rank Blind results now read as your ranking, first place to last, and each item carries where it came in the draw — the order things were shown to you is half the story when you are ranking blind, and until now nothing recorded it.",
      "Rank Blind packs get a Podium finishes table: how often each item landed first, second or third across every play, ranked by the three combined. An item that is reliably near the top says more about a pack than one that wins occasionally and is forgotten the rest of the time.",
      "1v1 asks you to confirm a pick before moving on, like every other format — a misclick no longer decides the matchup for you, and you can change your mind while comparing.",
      "Finishing a 1v1 pack goes straight to your result instead of stopping at a summary page first.",
      "Every play screen now shows which pack you're playing at the top, so a shared link tells you what you've opened.",
      "Playing, browsing, editing and reading a result now all sit in a column of the same width, instead of each screen choosing its own and shifting the page under you as you move between them.",
      "Sharing a result now produces a short link in every format. 1v1 and Rank Blind were still packing your whole run into the address — a long Rank Blind result ran past six thousand characters, where the short form is barely a hundred.",
      "Fixed play screens occasionally rebuilding themselves on load, which could briefly show one set of items and then swap to another.",
      "You can keep up to three drafts at a time. Publish or delete one to start another — drafts are private and never expire, so this keeps them from piling up unseen.",
      "Browsing packs is quicker: the home feed now loads only the page you're looking at instead of every pack behind it, so search and filtering stay fast as the library grows.",
      "Finishing a play saves faster on popular packs, which used to get slower with every play they collected.",
      "Fixed Discord and Google sign-in leaving you on the sign-in page even though it had worked — if the pop-up closes before handing the session back, we now pick it up on the next check instead of dropping it.",
      "Fixed a pack's results page failing to load after its author changed the pack's format.",
      "Form fields across the site are now properly labelled for your browser, so autofill and password managers work with them.",
      "Editing a pack through the API or an MCP client now accepts just the fields you're changing, instead of requiring the whole pack on every edit.",
    ],
  },
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
