# Spy Mode — Design Spec

> **Status:** proposed — awaiting owner review before the implementation plan.
> **Repos:** `velanto-backend` (this spec) + `velanto-frontend` (its own FE spec, later slice).
> **Product context:** `../../../velanto-frontend/docs/multiplayer-modes-redesign.md`. Spy is **not** in that brief — it is a new seventh mode, and this spec is its whole design.
> **Builds on:** `2026-07-26-universal-rooms-mode-model-design.md` (the mode registry + `RoomEngine` seam), `2026-07-26-guess-who-mode-slice-2a-design.md` (the `RoomEndgame` seam), `2026-08-05-anonymous-multiplayer-design.md` (guests hold ordinary seats).

---

## 0. One-paragraph summary

One seated player is secretly the **spy** and plays the same server-drawn game on a **deliberately incomplete board** — half the round's options are redacted for them, and for `1v1`/`nxn` they see only one side (its pool name included). Everyone else sees the full board. Unlike Guess-who, identities are **not** masked: every pick is public, live, under the player's real name. The spy has to keep picking plausibly on partial information; everyone else watches for the person whose choices don't add up. After the last round, every non-spy names one player as the spy, and the game resolves on a scored leaderboard. Spy is the **first mode whose wire differs per viewer**, and that — not the game rules — is the load-bearing engineering change.

---

## 1. Scope

### In scope

1. A **per-viewer room projection seam** — `snapshot(room, viewerId)` plus per-seat fan-out for the board-carrying broadcasts. Byte-for-byte no change for the six existing modes.
2. The **`spy` mode**: registry descriptor, `SpyEngine`, redaction model, `SpyEndgame` (the accusation phase), scoring, and the widened result unions.
3. **Stats**: the spy's own picks are excluded from the pack's `PlayRecord`s.
4. Unit + e2e coverage, including the anti-leak assertions (§10) that are the real acceptance criteria.

### Explicitly NOT in scope

- Frontend. Its own slice and its own spec: redacted card treatment, the "SPY" self-badge, the accusation screen, the reveal, i18n ×8, `ModePicker`/`ModeHowItWorks` copy, the `/updates` bullet.
- More than one spy per game (§12).
- `rank_blind`. Excluded by the owner, and structurally right: you cannot produce an ordering over items you cannot see, and the format's whole action is a full permutation.
- Any change to the other six modes' gameplay.

---

## 2. Product rules

### 2.1 The role

- Exactly **one** spy, drawn uniformly at random from the frozen roster at game start (same moment Guess-who assigns labels).
- The spy **knows** they are the spy — their own nickname is marked. Nobody else is told, ever, until the reveal.
- Everyone knows a spy **exists**. The mode's identity is the hunt.

### 2.2 The redacted board

Redaction is re-drawn **fresh every round** (a fixed hidden set for the whole game would be readable off two rounds of picks).

| Format                       | Round board     | The spy sees                                                                                 |
| ---------------------------- | --------------- | -------------------------------------------------------------------------------------------- |
| `save_one` / `sacrifice_one` | `K` drawn items | `floor(K/2)` items; `ceil(K/2)` redacted — 5 → sees 2, hides 3                               |
| `1v1`                        | 2 items         | 1 item (`floor(2/2)`, the same formula)                                                      |
| `nxn`                        | 2 sides         | **one side entire** — its pool name and its items; the other side's **name is redacted too** |

Hidden options are rendered as **redacted placeholders, never as absences**. The spy must know the board's _shape_ — how many options exist — or others' picks cannot be attributed to a slot and the spy cannot even tell how much they are missing.

### 2.3 Acting

- Every seated player locks **one** pick per round. The round resolves when every seated player has picked (the never-skip gate every mode uses — a dropped player keeps their seat and the round waits).
- **The spy may pick a redacted option, blind.** This is load-bearing, not a convenience: in `1v1`/`nxn` the spy sees exactly one of two options, so restricting them to visible options would leave them zero choice and identify them by round two.
- Picks reveal **live, as they land**, under real names — matching Guess-who's live-reveal precedent.

### 2.4 The derived rule that keeps live reveal from dissolving the mode

Live reveal and redaction collide, and the collision has exactly one coherent resolution:

> **A slot hidden from the spy stays hidden from the spy even after someone picks it.**

The spy sees _"3 players picked option 2"_ where option 2 is a card they cannot read. They learn the crowd's shape without learning the board — and must decide whether to follow a favourite they cannot see. This is better tension than either alternative (un-redacting on pick would hand the spy the whole board by the third pick; hiding others' picks entirely would contradict "everyone sees all picks").

> ⚠ **Superseded — see [§13 Amendment 1](#13-amendments).** The owner has since chosen the third option this paragraph rejected: the spy sees no live picks at all. That is the shipped behaviour as of 2.2.0; the rule above is history.

### 2.5 The endgame

- After the last round the room enters an **accusation phase**.
- Every **non-spy** submits exactly one userId: who they think the spy is. Candidates are the roster minus themselves.
- The **spy submits nothing** and is told so. A submission from the spy is rejected (`is_spy`).
- The phase resolves when every seated non-spy has submitted, or the deadline fires — the same gate Guess-who's endgame uses.

### 2.6 Scoring

- **Accuser:** +1 for naming the spy.
- **Spy:** +1 for every accuser who named somebody else.

Both ride one leaderboard. `RoomLeaderboard` on the frontend is already mode-agnostic (`{userId, username, avatarKey, score}[]`) and is reused unmodified.

### 2.7 The results surface — Guess-who's evidence table, de-anonymised

The results screen is **the same shape as Guess-who's**: one row per round, one column per player, every pick in the open — the difference being that the columns are **real players** (avatar + username), not anonymous labels.

This is the mode's evidence base, not a summary shown afterwards. A single round gives nobody away (people often pick the same thing); it is the shape of a whole **column** that is recognisable, which is exactly the argument Guess-who's own table already makes. So the table is what the accusation screen is read **from** — it is present during the accusation phase, and at reveal the spy's column is marked so the room can read it back against what that player could actually see.

There is **no per-round winner**. A round has no shared verdict — every player's pick is their own (§2.3, and see §7: each non-spy's picks record as a solo playthrough). Anything a results screen shows as "what the room went with" is the **majority of `picks`, derived on the client** for context, never a server-side resolution. A real per-round verdict would be a different mode: it would change the result shape, the stats mapping, and require a tiebreak rule.

Frontend consequence for slice C: the presentational table inside `GuessWhoLabelTable` should be extracted into a shared, column-source-agnostic component that both modes render, with `GuessWhoLabelTable` kept as a thin wrapper so Guess-who's behaviour and tests are untouched.

### 2.8 Departures

- **Spy leaves mid-game:** the game continues as an ordinary shared game; the reveal still names them, and accusers who named them still score. No re-draw — reassigning the role mid-game would make every prior round's evidence a lie.
- **Roster drops below the mode's minimum:** the game finishes without a reveal, exactly as Guess-who does today (`scores` absent, not zeroed).

---

## 3. The redaction model — the load-bearing part

### 3.1 Why this is new

Every mode shipped so far broadcasts **one identical board to the whole room**: `snapshot(room)` is room-wide and `emit(room, …)` goes to `toRoom`. The single per-caller field in existence is `myGuess`, filled by the named `withMyGuess` wrapper at the REST read. Spy is the first mode where the **wire itself must differ per viewer**.

Client-side hiding is not an option and never was: the redacted content would sit in the socket payload, one devtools panel away, and the hidden information _is_ the mode.

### 3.2 Real item ids cannot be sent for hidden options

This is the finding that shapes the implementation. Room boards carry the pack's **real item ids**, and a pack's rounds and pools are **publicly readable** via `GET /packs/:id`. So a spy handed the id of an option whose content is redacted can simply fetch the pack and look it up. Omitting only the _name_ while keeping the id leaks the entire board.

**Solution — per-round opaque tokens.** At `buildRound`, every option hidden from the spy is assigned a fresh random token (16 bytes hex, `crypto.randomBytes`), held in a server-side `Map<token, realOptionId>` on the live round. The spy's board carries tokens in place of the real ids, in the real slots. Consequences:

- The option **count and slot order are preserved**, so pick attribution, the board layout and every existing client code path work unmodified.
- The spy **picks the token**; `SpyEngine.applyAction` translates it back to the real option id before recording. To the rest of the room the spy's pick is an ordinary, fully-named pick.
- Others' picks on a hidden option are reported **to the spy** as that option's token — §2.4, enforced by construction rather than by a client's good behaviour.
- Tokens are per-round and per-game: they carry no information and survive nothing.

### 3.3 What is redacted, and when

| Payload                                                      | Redacted for the spy?                                                                                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| The **live** round board (`state.round`, `round.started`)    | **Yes**                                                                                                                                             |
| Live pick events (`pick.locked`) — ANY option, hidden or not | **Withheld entirely** — the spy is sent no other player's pick at all (Amendment 1). Their own still travels, so they can see their click register. |
| **Resolved** rounds (`results[]`)                            | **No** — a finished round is fully public to everyone, spy included. There is no decision left in it, and the projection stays small.               |
| Which options were hidden, in any given round                | **Secret from everyone** until the final reveal — see below                                                                                         |
| The roster, lobby, phase, countdowns, presence               | No                                                                                                                                                  |

**The per-round hidden sets are never on the wire during the game.** They are the sharpest possible tell — _"the spy could only see A and B; who picked A or B?"_ narrows the room to one or two people instantly. They accumulate in room memory and ship once, inside the endgame reveal, where they make the recap ("here is what the spy was actually looking at each round") the payoff of the whole mode.

Because resolved rounds are public in full, the durable `FriendsRoomRound` rows and the per-round broadcast are **unchanged in shape** — only the live projection differs.

### 3.4 The seam

```ts
// service
private snapshot(room: LiveRoom, viewerId?: string): RoomState
```

plus one named broadcast helper:

```ts
/**
 * Fan a board-carrying payload out. Every mode but `spy` gets ONE room-wide
 * emit, byte-for-byte as before. `spy` gets one emit per seat, each built for
 * that viewer — the only place in the app where two players are told different
 * things about the same board.
 */
private emitPerViewer(room: LiveRoom, event: RoomEvent, build: (viewerId: string) => unknown): void
```

`room.mode` is fixed for a room's whole life, so this branches once and every other mode keeps its existing single-emit path verbatim. `RoomBroadcaster.toPlayer` already exists (it serves `claim.rejected`), so **the gateway contract does not change**.

---

## 4. Live state additions

On `LivePlayer` (the file already documents each mode's own fields — same pattern):

```ts
/** Spy mode: is this player THE spy? Assigned once at game start, never on the
 *  public wire — each viewer learns only their own flag (RoomState.iAmSpy). */
spy: boolean;
/** Spy mode: this round's locked pick (a real option id — a token is translated
 *  back before it is stored), or null. Public the moment it lands. */
spyPick: string | null;
/** Spy mode: this player's accusation for the endgame, or null. Server-only:
 *  the wire exposes only THAT they submitted. */
accusation: string | null;
```

A dedicated `spyPick` rather than reusing Guess-who's `selection`: a room plays exactly one mode for its life so there is no collision risk, but conflating them would imply a shared meaning that does not exist (`selection` is blind-until-reveal; `spyPick` is public on landing).

On `LiveRound`:

```ts
/** Spy mode: the option ids the spy CAN see this round. Server-only. */
spyVisibleOptionIds?: string[];
/** Spy mode: token → real option id, for the options the spy cannot see.
 *  Server-only, regenerated every round. */
spyTokens?: Map<string, string>;
```

On `LiveRoom`: `spyHiddenByRound: string[][]` — the per-round hidden sets, accumulated for the reveal.

No Prisma migration. `FriendsRoom.mode` already stores an arbitrary mode string, and the round rows are unchanged (§3.3).

---

## 5. Engine and endgame

### 5.1 `SpyEngine implements RoomEngine<SpyPlannedRound>`

- **`planGame`** — the draw is the ordinary per-round option draw the mode's formats already use. `spy-draw.ts` mirrors `voting-draw.ts`, which already handles all four target formats (items for `save_one`/`sacrifice_one`/`1v1`, sides for `nxn`). Expect it to be nearly a re-export; the plan will confirm rather than assume.
- **`onGameStart`** — pick the spy with the injected `shuffle` (tests get determinism the same way Guess-who's label assignment does); reset `spyPick`/`accusation`.
- **`buildRound`** — build the shared board, then compute the spy's visible subset and mint tokens for the rest, recording the hidden set on the room.
- **`applyAction`** — translate a token if the actor is the spy; validate against the actor's _own_ board (a non-spy sending a token is `not_in_round`, and so is a spy sending the real id of an option hidden from them — a leak-detector as much as a validation); record; broadcast `pick.locked` **per viewer**; resolve when every seat has picked.
- **`onRosterShrinkDuringRound`** — `'resolve'` if every remaining seat has picked, else `'wait'`. Never `'rebuild'`: the board does not depend on roster size, and a rebuild would re-roll the redaction mid-round.
- **`resolveRound`** → a new `SpyRoundResultState { kind: 'spy_round'; index; name; items; picks: Record<userId, string[]>; sides? }`, widening the `RoundResult` union. Keyed by **userId**, not by label — deliberately not a reuse of Guess-who's `reveal`, whose `picks` are label-keyed and whose stats mapping branches on exactly that.
- **`endgame`** — set, which is the entire switch that makes the service open a phase after the last round.

### 5.2 `SpyEndgame implements RoomEndgame`

- **`start`** — reset `accusation`; freeze the prompt as the roster's userIds. Reuses `EndgamePrompt` with `labels: []` (there are none) — the plan should check whether that reads as a hack or as honest reuse; a small `candidateUserIds`-only variant is acceptable if it is cleaner.
- **`applyAction`** — reject if the actor is the spy (`is_spy`); reject a userId not in the frozen prompt or equal to the actor (`malformed`); record; broadcast that they submitted, never whom. Resolve when every seated non-spy has submitted.
- **`resolve`** → `SpyRevealResult { kind: 'spy_reveal'; spyUserId; accusations: Record<accuserId, accusedId>; hiddenByRound: string[][] }`, widening `EndgameResult`.

`publicEndgame` becomes a switch on `kind`. The spy branch ships `spyUserId`, `hiddenByRound` (public now — the game is over) and `scores` per §2.6; individual `accusations` stay private exactly as `guesses` do today, and for the same stated reason: a wrong accusation names a specific person, and that is nobody else's business.

### 5.3 Registry

```ts
SPY_DESCRIPTOR = {
  mode: "spy",
  formats: ["save_one", "sacrifice_one", "1v1", "nxn"],
  minPlayers: 4,
  maxPlayers: 8,
  feasibility:
    rounds >= 3
      ? { available: true, maxPlayers: 8 }
      : { available: false, maxPlayers: 0, reason: "Needs at least 3 rounds" },
};
```

- **4 players minimum.** At 3 it is one spy and two accusers guessing between two names — a coin flip, not a deduction. At 2 it is degenerate.
- **3 rounds minimum.** Fewer picks than that and nobody has a read; the number is deliberately lower than Guess-who's 5 because the spy's _distortion_ is a much louder signal than a label's trajectory.
- **No pool-size constraint.** Every one of the four formats already guarantees ≥2 options per round, and `floor(2/2) = 1` is a playable spy board.
- `DEFAULT_MODE_PREFERENCE` — spy goes **last**, after `guess_who`. Its floor of 4 is the highest of any mode, and the list's stated rule is that a mode must never be the default for a roster that cannot start it.
- `ROOM_MODES` gains `'spy'`, which is mirrored on the frontend (`room-types.ts`) with the reciprocal `cross-repo-drift` snapshot update — **both repos in the same change**.

---

## 6. Wire surface

- **`ROOM_MODES`** += `'spy'`.
- **`RoomState`** += `iAmSpy: boolean | null` — per-viewer, filled only by the projection, `null` before the game starts. A sibling of `myGuess`, and never filled by a room-wide build.
- **`RoundState`** — reuses `optionIds` / `sides` / `items`; hidden entries carry a token id and a `hidden: true` marker so the client renders a redacted card rather than an item with a blank name. `picks: Record<userId, string[]>` carries the live tally (public — the mode's whole social layer).
- **New events:** none needed beyond reusing `pick.locked` / `pick.rejected` semantics; the plan will confirm whether spy warrants its own event names for wire clarity or genuinely reuses these.
- **New commands:** `accuse` (`{ userId }`) alongside the existing `guess`.
- **New rejection reasons:** `SPY_ACCUSATION_REJECTION_REASONS = ['not_a_player','not_guessing','malformed','is_spy']`.

---

## 7. Statistics

Per the established rule, a per-player-picks mode records **N individual solo playthroughs**. Spy records them for the non-spies only: **the spy's picks are dropped.** They were made against a deliberately falsified board, and counting them poisons the pack's aggregate "what do people actually choose" data with one player's semi-random guesses every game.

`stats/room-play-context.ts`'s `RoomPlayer` gains `spy: boolean` (alongside the existing `label`), and `room-play-records.ts` skips the spy's draft. `LivePlayer` satisfies it structurally, as it already does.

---

## 8. Concurrency

The event-loop-as-mutex invariant is unchanged and is the primary review checkpoint, as it is for every mode slice:

- `SpyEngine`'s and `SpyEndgame`'s methods are **synchronous**, including token minting (`crypto.randomBytes` is sync).
- The per-viewer fan-out happens **after** the synchronous mutation, in the same broadcast step the single-emit path occupies today. It adds N sends where there was one; it introduces **no `await`** between reading room state and mutating it.

---

## 9. Risks

| Risk                                                                                                                                 | Mitigation                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A redaction leak** — one payload built room-wide instead of per-viewer silently hands the spy the board, and nothing fails loudly. | The §10 anti-leak tests are the mode's real acceptance criteria. Every board-carrying emit goes through the one named `emitPerViewer` helper so the set of leak sites is greppable rather than remembered. |
| **Real ids leak the board via `GET /packs/:id`**                                                                                     | §3.2 tokens. Called out here because it is the exact bug that "just omit the name" would have shipped.                                                                                                     |
| Refactoring `snapshot()` regresses the other six modes                                                                               | Slice A is a **pure refactor with no behaviour change**, reviewed on its own, pinned by the existing event-stream regression specs.                                                                        |
| Two players sharing a physical screen defeat the hidden information                                                                  | Unfixable and out of scope — the same accepted limit every hidden-role game has. Worth one line of in-app copy, not engineering.                                                                           |
| `EndgamePrompt` reuse (`labels: []`) reads as a hack                                                                                 | Flagged in §5.2 for the plan to settle either way.                                                                                                                                                         |

## 10. Testing

Standard unit + e2e per the mode-slice pattern (registry integrity, feasibility bounds, engine action outcomes, endgame guards, full-game e2e). The **mode-specific** additions that matter:

- **Redaction, per format** — `K → floor(K/2)` visible for 5/4/3/2 items; `1v1` and `nxn` see exactly one side; the hidden `nxn` side carries **no pool name**.
- **Anti-leak (the acceptance criteria).** Capture every payload the fake broadcaster sends to the spy across a full game and assert that **no hidden option's real id, name or image key appears in any of them** — a whole-payload deep scan, not a field-by-field check, so a leak through a field nobody thought about still fails.
- **The mirror** — assert non-spies' payloads contain the full board, so the projection cannot be "fixed" by redacting for everyone.
- **§2.4** — a non-spy picks a hidden option; the spy's `pick.locked` carries the **token**, and the option stays redacted on their board.
- **Token translation** — the spy picks a token and the resolved round records the **real** option id; a non-spy sending a token is rejected; a spy sending the real id of an option hidden from them is rejected.
- **Scoring** — accuser +1 for a correct call; spy +1 per wrong accusation; a departed spy still resolves; a sub-minimum roster finishes with no `scores`.
- **Stats** — a finished game produces `N-1` `PlayRecord`s, and none of them is the spy's.

---

## 11. Delivery slices

| #     | Repo     | Content                                                                                                                                                                                                                                                                                                                                                                                                | Why separate                                                                                                                                                              |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | backend  | The per-viewer projection seam only: `snapshot(room, viewerId)`, `emitPerViewer`, `iAmSpy` plumbed as always-`null`. **Zero behaviour change.**                                                                                                                                                                                                                                                        | It touches the concurrency-critical broadcast path for all six live modes. It deserves its own review, with the existing event-stream pins as the proof of no regression. |
| **B** | backend  | The mode itself: draw, engine, endgame, registry, tokens, scoring, stats exclusion, the §10 suite.                                                                                                                                                                                                                                                                                                     | The gameplay, reviewable against a seam that is already trusted.                                                                                                          |
| **C** | frontend | `ROOM_MODES` mirror + drift snapshot, redacted card treatment, the "SPY" self-badge, the live public tally, the shared pick-history table extracted from `GuessWhoLabelTable` (§2.7), the accusation screen, the reveal + leaderboard, `ModePicker`/`ModeHowItWorks` copy, i18n ×8, the `/updates` bullet. Mocks: `design/extracted_v2/Spy Mode.dc.html`, `Spy Results.dc.html`, `Room Lobby.dc.html`. | Its own spec and its own PR, per the established cross-repo pattern.                                                                                                      |

Backend deploys before the frontend merges; the frontend cannot select a mode the server does not register.

## 12. Deliberately deferred

- **More than one spy** at 7–8 players (accusation becomes a set, scoring becomes partial credit). Real, and a different game.
- **Spy-specific copy per format** ("you can only see one side") — frontend polish, slice C.
- **A spy-side objective beyond evading** (e.g. bonus for landing on the crowd favourite blind). Would deepen the mode; not needed to ship it.

---

## 13. Amendments

Changes to the rules above, made after the spec was first agreed. Each says what shipped, what replaces it, and whether it is built yet.

### Amendment 1 — the spy sees no live picks

_Raised 2026-08-06, during the 2.2.0 design pass. **Implemented** in 2.2.0, superseding §2.4._

**The change.** While a round is open, the spy is shown nobody else's pick. Not a tokenised pick, not a count against an unreadable card — nothing. They choose from their half-board in silence. Non-spies are unaffected and keep seeing every pick live, exactly as now.

**What it supersedes.** §2.4 chose "a hidden slot stays hidden even after someone picks it" and explicitly rejected hiding others' picks entirely, on the grounds that it contradicts the product line _"everyone sees all picks"_. That reasoning still stands as written — it is the requirement that has changed, not the logic. Resolved rounds are untouched: they stay fully public to everyone including the spy (§3.3), so nothing about the recap or the evidence table changes.

**Why it is better.** §2.4's rule keeps the _board_ secret but still hands the spy the crowd's _shape_ — "three people took option 2" is enough to follow the room without being able to read it, which is precisely the camouflage the mode is trying to deny them. Removing it means a spy cannot blend in by copying; their picks have to come from half a board and nothing else, so they diverge more, and the pick table that the accusation is read from gets sharper. The mode's whole detection surface improves.

**What it costs.** The spy's screen goes quiet mid-round while everyone else's fills up, and quiet reads as broken. This needs copy — one line on the spy's board saying the room's picks are hidden _from them_, deliberately — or it will be reported as a bug. That copy is the real work here; the mechanic is small.

**How it was built.** `projectSpyPickEvent` returns `undefined` for a pick that is not the spy's own, and `emitPerViewer` now treats `undefined` as "send this viewer nothing" — a stronger redaction than any projection can express, since an empty payload would still say somebody moved. `spyRoundFields` drops the same picks from the SNAPSHOT, or a reconnect would hand back exactly what the live wire refuses. `round.resolved` is not touched. The e2e anti-leak scan should gain the reciprocal case: `liveSeenBy(spy)` must contain no other player's `spy.picked` at all, which is a strictly stronger assertion than the current "no real id for a hidden option".

**Resolved: no bare count.** A count is the crowd signal in its weakest form, and the amendment exists to remove that signal — keeping it would have left the spy able to time their pick to the room's. The board carries an explicit panel instead (`spy.picksHiddenHeading` / `picksHiddenNote`) and drops the "N of M picks in" progress line, which counted only the spy themselves once the picks stopped arriving.
