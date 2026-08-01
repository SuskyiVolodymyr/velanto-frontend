# Multiplayer Modes — Design Brief

> **Audience:** the designer doing the full UI redesign (has the whole frontend codebase to read).
> **This document is a DELTA.** It describes what is *new or different* from the current implementation — not a restatement of what exists. Where a screen already exists, it says what changes; where a screen is new, it describes it in full.
> **Scope:** how packs are *played* (rooms + modes) and how they are *created*. It deliberately does **not** cover data model / socket-event / API contracts — those are a separate engineering concern.
> **Status:** product design agreed with the owner; visual/interaction design is the open work this brief feeds.

---

## 0. The one-paragraph summary

Today the app has five single-player formats that play at `/packs/[id]/play`, plus one separate format (`save_one_friends`) that plays only in a live room. We are collapsing that split: **a "room" becomes a universal play surface, and every pack — of any format — can be played solo OR with friends in a room.** A room now carries a **mode** (chosen by the host in the lobby), and each format offers several modes. The `save_one_friends` format disappears; its live-claim gameplay becomes just *one mode* ("Claim") available to ordinary `save_one` packs. This adds a set of new in-room screens (a mode picker, several new round mechanics, and — for the first time — a scored/winner screen) and some changes to the pack creator.

---

## 1. Current state (the baseline this delta is measured against)

So the designer knows exactly what changes, here is what exists today:

- **Solo play** — `PlayRouter.tsx` switches on `pack.format` and renders one of: `PlayScreen` (save_one / sacrifice_one / nxn), `HeadToHeadPlayScreen` (1v1), `RankPlayScreen` (rank_blind). `save_one_friends` 404s here by design.
- **Rooms today** — `RoomScreen.tsx` switches on `state.phase`: `lobby → round → between → finished` (+ `abandoned`, `kicked`, reconnecting banner). This exists **only for `save_one_friends`**. The one round mechanic is the exclusive **claim** board (`RoomRound` / `RoomItemCard`), the between-round survivor screen (`RoomBetween`), and the results (`RoomResults`).
- **Entry points** — `FriendsRoomEntry.tsx` (Create room / Join by code) shows on a `save_one_friends` pack page *instead* of the solo Play button. Every other format shows a solo Play button.
- **Creator** — `FormatSection.tsx` offers **six** formats as a segmented picker; `save_one_friends` is one of them, with its own editor body (`FriendsRoundsEditor`, no count field, pools ≥ 5).
- **Lobby** — `RoomLobby` shows the 2–4 players, Ready votes, a stream-safety Lock toggle, and Copy-code. Capacity is fixed at 4.

Keep all the room *infrastructure* the designer already sees (lobby shell, presence/reconnect, stream-safety lock, copy-code, countdown between rounds, kicked/ended states) — it is format-agnostic and stays. What changes is **what fills the round, and how a room is set up.**

---

## 2. The core new concept: a room has a **mode**

A room is created over a pack, and in the lobby the **host picks a mode**. The mode decides the round mechanic, the resolution rule, and the results screen. Modes are (mostly) orthogonal to format: several modes are shared across formats, and a couple are format-specific.

### 2.1 Format → available modes

| Mode | save_one | sacrifice_one | 1v1 | nxn | rank_blind |
|---|:---:|:---:|:---:|:---:|:---:|
| **Voting** (majority + priority tiebreak) | ✓ | ✓ | ✓ (base) | ✓ (base) | — |
| **Claim** (exclusive, one survivor) | ✓ | ✓ | — | — | — |
| **Turn-based cut** (sequential elimination) | ✓ | ✓ | — | — | — |
| **Guess Who** (match the builds) — *universal* | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Shared grid** (aggregate ranking) | — | — | — | — | ✓ |
| **Relay** (collective blind ranking) | — | — | — | — | ✓ |

Notes for the picker UI:
- **Voting is the universal baseline** for every format *except* rank_blind (you cannot "vote for one" of an ordering). It is the mode that lets *any* pack be played with friends.
- **Guess Who is universal** — it works for any pack where each player makes a per-round choice.
- rank_blind is the odd one out: no Voting/Claim/Cut; instead Shared grid, Relay, and Guess Who.
- **1v1 and nxn are "binary" formats** (each round is a 2-option choice). They intentionally get *only* Voting + Guess Who. A tournament/bracket idea was explicitly rejected (a 1v1 pack's rounds can be different dimensions — e.g. an RPG "build a character": round 1 eye colour, round 2 height — so cross-round brackets are nonsense).

### 2.2 Feasibility — not every mode fits every pack

A mode can be **unavailable for a given pack** and must be shown disabled in the picker with a short reason:
- **Claim** needs each round to draw **players + 1** items → the pack's pools must be large enough for the room's size. If the pool is too small, Claim is greyed for that room size.
- **Guess Who** needs **≥ 3–4 players** and **≥ ~5 rounds** (a short build is indistinguishable from another's). Below that, it's disabled.
- **Voting / Turn-based cut** need only **≥ 2 items per round** → available for essentially any pack.

The designer should design the **disabled-mode state** (greyed card + one-line reason, e.g. *"Needs bigger pools for 4 players"*, *"Needs at least 5 rounds"*).

### 2.3 Room sizes per mode

- **Claim:** 2–4 (unchanged — game-design limit; larger draws need huge pools and the first-mover advantage widens).
- **Voting / Guess Who / rank modes:** up to **8** comfortably, **~12** max. The limit is social/UX (voice chat, readable results, the "wait for everyone" gate), not technical. **Large rooms must not wait for stragglers:** a round resolves when everyone has acted *or* a countdown fires *or* a majority is already mathematically locked.

---

## 3. New UI concepts to invent a visual language for

These do not exist today and need a designed treatment:

1. **Mode picker** (lobby) — a set of mode cards: name, one-line blurb, player-range, and an enabled/disabled state with reason. Host-only; guests see the chosen mode read-only.
2. **Priority holder** — a rotating "tiebreak" role. One player each round holds *priority*; on a tie their vote (binary) or their pick-among-tied (multi-option) decides. Show it as a badge/crown on that player's avatar, visible **before** voting (so the room knows whom to persuade). It rotates each round.
3. **Live vote tally** — during Voting, everyone sees the running count per option, updating as votes land and change.
4. **Turn indicator** — for Turn-based cut and Relay: "whose turn it is now," and a clear "it's *your* turn" state.
5. **Anonymous player labels** — for Guess Who: stable anonymous handles (Player X / Y / Z) whose choices accumulate over the game.
6. **Scored results / winner screen** — *brand new to the app.* Guess Who (and any future scored mode) ends on a leaderboard + winner, which the app has never had. The visual system for points/winner is a fresh design problem.

---

## 4. Screen-by-screen delta

### 4.1 Pack detail page

- **Today:** solo Play button (5 formats) **or** `FriendsRoomEntry` (only save_one_friends).
- **New:** **every pack** shows both paths:
  - **Play** (solo) — unchanged behaviour, for any format that has a solo path (all five do).
  - **Play with friends** — Create room / Join by code, now on **every** pack, not just the old friends format.
- Optionally surface, near "Play with friends," a hint of which modes this pack supports (or at least that it can be played with friends). The signed-out gate (tooltip, no surprise redirect) stays as it is in `FriendsRoomEntry`.

### 4.2 Lobby (delta)

Keep the existing lobby (players, Ready, Lock, Copy-code, reconnect). **Add:**
- **Mode selector** (host-only) — the cards from §3.1. Selecting a mode may change the **capacity** shown (e.g. 2–4 for Claim, up to 8–12 for Voting) and which players-count warnings appear.
- **Mode summary for guests** — non-hosts see the selected mode + its blurb, read-only.
- **Priority preview** (for Voting modes) — optionally introduce the priority-holder concept here so it isn't a surprise mid-game.
- Ready/start rules are unchanged in spirit (all present players Ready, ≥ min for the mode).

### 4.3 Round mechanics (one per mode — the bulk of the new work)

For each, the designer needs: the board layout, the act, the live feedback, the resolution, and the between-round beat.

#### (a) Claim — *mostly unchanged*
The current `save_one_friends` board. Everyone claims one of `players+1` items to sacrifice; claims are exclusive; the unclaimed item survives; resolves the instant the last claim lands; between-round survivor screen + countdown. Reuse today's `RoomRound` / `RoomItemCard` / `RoomBetween` largely as-is. Only change: it's now a *mode*, reachable from save_one/sacrifice_one packs (labels flip for sacrifice).

#### (b) Voting — *new*
- **Board:** the round's options. For save/sacrifice → the set of items; for 1v1 → two items; for nxn → two sides (each a list of items).
- **Act:** tap one option to vote. **Live tally** shows the running count. You may change your vote while anyone is still undecided.
- **Priority:** the priority holder's badge is visible. Priority only matters on a **tie**.
- **Resolution:** majority wins. On a tie → the priority holder decides (binary: their side; multi-option: they pick among the tied). Always decisive, never a coin flip.
- **Between round:** show the winning option (the "result" of the round) + countdown, like Claim's survivor screen.
- **Label per format:** "Save" / "Sacrifice" / "Winner" / "Which side" — same mechanic, different verb.

#### (c) Turn-based cut — *new (save/sacrifice)*
- **Board:** the full round set of items.
- **Act:** players take turns; on your turn you **remove one** item. The board shrinks each turn until one remains (the saved one; inverted for sacrifice).
- **Feedback:** strong "whose turn" indicator; the removed items visibly drop out.
- **Resolution:** deterministic, no ties, no votes. Works at any room size and any pack with ≥ 2 items.
- Design the "waiting for X to cut" state and the "it's your turn to cut" state.

#### (d) Guess Who (match the builds) — *new, universal, the marquee social mode*
This is the richest new screen. Genre: *how well do you know your friends.*
- **During play:** each round, you first **lock your own choice blind**; *then* each **anonymous label's** (Player X/Y/Z) choice for that round is revealed. Over the game, each label accumulates a "build" (a growing column of choices). You watch the trajectories and form theories live. (Blind-then-reveal prevents copying.)
- **Why labels, not a per-round tally:** in a binary round two people pick the same option, so a single round can't be attributed — but a label's *accumulated* trajectory is unique.
- **End screen:**
  1. A **history table** — rows = rounds, columns = the anonymous labels — so the whole chronology of who-picked-what is reviewable.
  2. Below it, an **assignment UI**: drag/assign each real participant to a label (a bijection — each label to a distinct person).
  3. After everyone submits → **reveal**: show the true mapping, marking each of your guesses **green (correct) / red (wrong)**.
  4. **Winner / leaderboard** — most correct assignments (see §4.4).
- **Requirements:** ≥ 3–4 players, ≥ ~5 rounds (else disabled in the picker).
- **Tone:** secrecy/bluff, not argument. (Note: scoring rewards *only* guessing others, never being un-guessed — so players have no incentive to fake their picks, which keeps recorded picks honest.)

#### (e) Shared grid — *new (rank_blind)*
- Everyone does their own blind ranking (the current solo rank_blind flow, in parallel).
- At the end, the individual rankings are aggregated into **one group grid** (Borda points; ties resolved and, if truly equal, shown as a **shared rank** — two items at the same position). Design the aggregate-reveal and the shared-rank tie display.
- Optional competitive layer ("alignment" — how close your ranking was to the group's) if scoring is adopted.

#### (f) Relay — *new (rank_blind)*
- One **shared** ranking is built collaboratively: items reveal one at a time to the whole room, and the player **whose turn it is places the current item blind** (without seeing the next), while others argue. Turn rotates.
- Keeps the "blind" tension but makes it a live, decisive, everyone-participates activity. Design the "your turn to place" state and the growing shared list.

### 4.4 Results screens

Two shapes now, and the designer should design both plus a clear visual distinction:

- **Shared-verdict results** (Claim, Voting, Turn-based cut, Shared grid, Relay) — a per-round outcome recap. Generalise today's `RoomResults`: one block per round showing what was shown, who chose what (avatars), and the winning/surviving option. No winner of the *session*.
- **Scored results / winner** (Guess Who; any future scored mode) — **new surface**: a leaderboard of players by points, a highlighted winner, and the green/red per-player detail. This is the first competitive results screen in the app; it needs its own visual language (points, ranking, winner celebration) that still feels part of the product.

### 4.5 Ended / kicked / reconnect

Unchanged in behaviour (`RoomEnded`, `RoomKicked`, reconnecting banner, exit-to-pack). No delta beyond making sure they work for all modes.

---

## 5. Pack creation changes

- **`save_one_friends` is removed as a format.** `FormatSection` goes from six formats to **five** (save_one, sacrifice_one, 1v1, nxn, rank_blind). Its old gameplay is now the **Claim mode** available in-room for save_one/sacrifice_one packs — not a separate thing to author.
- **Feasibility surfacing in the creator** — because "which modes can this pack run with friends?" now depends on the pack's content, the creator should hint at it. E.g. a small pool shows *"Too small for the Claim mode with 4 players"*; a pack with < 5 rounds shows *"Guess Who needs at least 5 rounds."* These are soft, informational — the pack still saves and is still solo-playable and voting-playable; they just tell the author which friend-modes they're unlocking.
- **Editor bodies** — the `FriendsRoundsEditor` (no count field, pools ≥ 5) is no longer a *format*; if the owner wants to keep authoring big-pool packs conveniently, that becomes a normal save_one pack whose pools happen to be large. The creator no longer needs a friends-specific editor branch.
- Everything else in the creator (pools, rounds, slots, tags, cover, moderation flow) is unchanged.

---

## 6. Cross-cutting UX notes

- **Solo/room parity** — the same pack is now playable both ways. The pack page, and anywhere a pack is described, should make "playable solo or with friends" legible.
- **Stream safety** — keep the existing lock + copy-code (never render the join code as plain text). No change.
- **"Who's active / whose turn"** — several new modes (Turn-based cut, Relay) are turn-based; the room needs a consistent affordance for whose turn it is and a clear "your turn" call-to-action.
- **Priority holder** — a consistent badge/treatment across all Voting modes.
- **Countdown** — the existing between-round countdown generalises to all modes' between-round beats.
- **Scoring is a new pillar** — points, leaderboards, and a winner moment are new to the whole product. Worth designing a small reusable system, since more scored modes may follow.

---

## 7. Known-open items (for context, not to design yet)

- **Scoring/winner visual system** — new; the designer is invited to propose it (see §3.6, §4.4).
- **nxn "faction" mode** — an optional nxn-only idea (a side = a team you're loyal to across rounds, with faction standings). Not committed; out of scope for this pass.
- **Minor mechanic details** still being finalised (turn-based cut: who makes the last cut on small rounds; relay specifics). They don't change the screens above.
- **Statistics note (not a screen):** a friends game where each player makes their own picks (Voting, Guess Who) is recorded as N individual solo playthroughs, so it feeds the same pack stats as solo. Shared-outcome modes (Claim, Turn-based cut) record one shared result. This has no UI surface beyond the results screens above; noted so nothing here contradicts it.

---

## Appendix — mode glossary (quick reference)

| Mode | One line | Formats | Result type |
|---|---|---|---|
| **Voting** | Everyone votes one option; majority wins; priority breaks ties | save, sacrifice, 1v1, nxn | Shared verdict |
| **Claim** | Exclusive claim of players+1 items; the unclaimed survives | save, sacrifice | Shared verdict |
| **Turn-based cut** | Take turns removing one until one remains | save, sacrifice | Shared verdict |
| **Guess Who** | Watch anonymous builds accumulate; guess who is who | all five | **Scored / winner** |
| **Shared grid** | Everyone ranks blind; aggregate into one group ranking | rank_blind | Shared verdict |
| **Relay** | Build one shared ranking, taking turns placing blind | rank_blind | Shared verdict |
