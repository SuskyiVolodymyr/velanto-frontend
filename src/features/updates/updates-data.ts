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
    date: "2026-08-08",
    version: "2.2.1",
    title: "Your pictures stay where you put them",
    bullets: [
      "Adding pictures to a pack no longer loses them. A picture only became part of a pack when you pressed Add or Save on that item, and there was nothing to tell you otherwise — so a picture dropped in and left there was quietly gone, however many times you saved the pack afterwards.",
      "Pressing Save while a picture is still uploading now waits for it and saves the item, instead of doing nothing. Clicking straight through to the next item saves the picture you just added rather than dropping it. And if a picture is still sitting unadded when you save the pack, the pack won't save until you deal with it — it tells you instead of pretending everything went in.",
      "Dropping a second picture while the first is still uploading now replaces it, rather than being ignored.",
    ],
  },
  {
    date: "2026-08-06",
    version: "2.2.0",
    title: "One of you is lying",
    bullets: [
      "Spy is a new way to play any Save One, Sacrifice One, 1v1 or NxN pack with friends. One player is secretly the spy, and half of every round is blacked out for them — on a versus pack they see one side and not even the other side's name. Everyone else sees the whole board.",
      "Every pick is public, live, under your real name — except to the spy, who sees none of them. They choose from half a board in silence while everyone else watches each other, so they can't blend in by following the crowd, and everyone else is watching for the person whose choices don't quite add up. Once a round closes it's public to everyone, spy included.",
      "After the last round everyone except the spy names who they think it was. Calling it right scores a point; the spy scores a point for everyone who looked somewhere else. The reveal then shows the whole game back to you — every pick by every player, and, for the first time, exactly which options the spy was blind to in each round.",
      "Needs three players and a pack with at least three rounds. The spy's own picks don't count toward the pack's statistics — they were choosing from half a board.",
      "Every room screen has been redesigned. Between rounds you see the round you just played rather than a summary of it — the two contenders side by side at full size with who took each, and the Next button up on the title row instead of below everything you have to scroll past.",
      "Room results now read like the single-player ones: the game's headline up top, then a round-by-round recap, with the leaderboard and a Top picked board of everything the room chose alongside it. Voting rounds show the faces of who voted for what instead of a percentage.",
      "The history tables in Guess Who and Spy show every option each round, not just the one that was taken — the pick in green and what it passed up in red, so a player's pattern is readable at a glance. In a Sacrifice One room the colours read the other way round, because there a pick is what you got rid of.",
    ],
  },
  {
    date: "2026-08-05",
    version: "2.1.0",
    title: "Join without an account, and find your way around",
    bullets: [
      "Someone you send a room code or an invite link to no longer needs to sign up first. They pick a nickname, and they're in the game — same seat, same reconnect if their phone drops, same everything a signed-in player gets. Guests show a small badge in the roster so you can tell who has an account and who typed a name into a box.",
      "Starting a room still needs an account, and a guest can only play the one room they were invited to — nothing else on the site opens up to them.",
      "There's a sidebar on every screen now. It starts collapsed as a strip of icons and opens when you want it, so you can get to your packs, history, people or the rules from wherever you are instead of going back to the dashboard first.",
      "Every page has a proper header. Your notifications bell and your account menu are in the same place on every screen, so unread notices no longer wait for you to wander back to the home page. Pages that need one now carry a back button that returns you where you actually came from — open a profile from the People list and back goes to People, not to the dashboard.",
      "The footer is on every page instead of a few, and it's compact enough to stay out of the way. Short pages fill the screen properly now, so the footer sits below the fold rather than floating halfway up an empty page.",
      "Browsing packs is easier to read. Each filter is its own labelled control — format, language, tag, sort — instead of a row of unlabelled boxes you had to open to find out what they were.",
      "Every dropdown on the site is now the same one. Language, format, sort, report reasons, moderation and admin controls all open the same way, look the same, and work with the keyboard — previously about half of them were the browser's own picker and looked different on every device.",
      "Signed out and clicking something that needs an account? You now get a small sign-in panel anchored to whatever you clicked, explaining what it's for. It used to be a tooltip that was easy to miss and impossible to use on a phone.",
      "Pack pages open on what you came for: the rounds list starts folded away, so the description, the modes and the play button are visible without scrolling past a long list first.",
      "Settings behaves. The on/off switches sit where they should and turn your accent colour when they're on, and the sections that only make sense with an account are hidden when you're signed out instead of showing you controls that do nothing.",
      "Your dashboard shows 15 packs a page instead of 12.",
      'Packs keep their cover everywhere. The play screen, the results, the room header and the "continue playing" rails all show the pack\'s own artwork instead of a plain gradient, so a pack looks like itself wherever you meet it.',
      'Fixed what a pick means in a Sacrifice One room. The game said "sacrifice one" and then asked every player to sacrifice something, which would have left nothing standing — a round only ever singles out one item. Claiming now means saving, and the item nobody claims is the one sacrificed. Save One rooms are unchanged, and read the opposite way round, as they always did.',
    ],
  },
  {
    date: "2026-08-01",
    version: "2.0.0",
    title: "Play any pack with friends, six different ways",
    bullets: [
      "Playing with friends is no longer one format's privilege. Open any pack, start a room, share the code, and pick how you want to play it — Claim, Voting, Guess Who, Turn-based cut, Shared grid or Relay. The host chooses the mode in the lobby, and the picker greys out any mode the pack is too small for and says why.",
      "Guess Who is the new headline mode. Everyone plays as an anonymous letter, and each round shows what P1, P2 and P3 picked without saying who they are. After a few rounds you assign every letter to a real person, everyone reveals at once, and the leaderboard scores who read the room best.",
      "The other new modes: Voting counts everyone's vote in the open, with a rotating priority holder who breaks ties. Turn-based cut hands the board round one player at a time until one item is left. Shared grid takes everyone's blind ranking and merges them into the group's order. Relay builds a single ranking together — you place the item in front of you, blind to what's still coming.",
      "Save One with Friends is now the Claim mode rather than a separate format, so it works on any Save One or Sacrifice One pack instead of only on packs authored for it. If you built one of the old friends-only packs, it is no longer listed.",
      "The whole app has been redesigned. Play, results, profiles, settings, moderation, the pack creator and every reading page were rebuilt — consistent headers, real loading skeletons instead of spinners, and layouts that hold together on a phone.",
      "Two new pages: History shows every pack you've played and lets you pick up the ones you didn't finish, and People is a browsable directory of everyone on the site.",
      "Moderators can now ask for changes instead of only approving or rejecting, and authors see exactly what was asked — and the reason, if a pack was turned down. You can also report an account, not just a pack.",
      "Play is steadier: refreshing mid-game offers to resume where you left off, videos pause when you switch tabs, and the 1v1, NxN and Rank Blind screens were rebuilt to be readable on small screens.",
    ],
  },
  {
    date: "2026-07-24",
    version: "1.8.1",
    title: "Rooms tell you where you are",
    bullets: [
      'Every round in a friends room now shows its name and counts itself against the game — "Round 3 of 16". The counter used to read "of 0" and no round carried a title, so one round looked exactly like the last and it was easy to think the room was serving the same one twice.',
      "A room no longer stalls on one player who wandered off. Five seconds after a round resolves it moves on by itself, with a countdown so you can see it coming. Everyone pressing Next still advances the room immediately.",
      'Fixed the end of a game showing "this room has ended" instead of your results. Every round of the game — who sacrificed what, and what survived — is there again when the last round finishes.',
      "The room now shows the pack you're playing on every screen, not just in the lobby, so a friend who joined from a link can always see what it is. When a game ends — or the host removes you — you're taken back to the pack instead of left on a dead screen.",
    ],
  },
  {
    date: "2026-07-23",
    version: "1.8.0",
    title: "Save One with Friends",
    bullets: [
      "You can now play Save One together, live, with 2–4 friends in a room. Open a Save One with Friends pack, start a room, and share the code — or send the invite link — to pull everyone in.",
      "Every round shows one item per player plus one more, and each of you claims one to sacrifice. No two people can cut the same item, and the single item nobody sacrifices is the one that survives. There's no turn order and no timer — claim, change your mind, and argue it out in real time.",
      "Between rounds you see exactly who sacrificed what, and a Next counter shows how many players are ready before the room moves on. Your join code stays hidden until you reveal it, so sharing your screen never leaks your room.",
      "You can build your own Save One with Friends pack too — pick it in the creator like any other format. Each round draws a pool at random, and the room decides how many items to show, so there's no per-round count to set; every pool just needs at least five items.",
      "You now get a notification when someone replies to your comment — not only when they @mention you. Toggle it in Settings like any other notification.",
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

/**
 * The newest shipped version, derived from {@link UPDATES} rather than pinned
 * anywhere — the Docs header shows it as a pill, and a hardcoded copy would go
 * stale the first time a release was added here and nowhere else. Sorted by
 * date for the same reason UpdatesScreen does: authoring order is not a
 * contract.
 */
export function latestVersion(): string | null {
  const newest = [...UPDATES].sort((a, b) => b.date.localeCompare(a.date))[0];
  return newest?.version ?? null;
}
