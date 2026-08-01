# 2.0.0 — Rooms UI implementation plan (all six multiplayer modes)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend play surface for all six backend room modes (`claim`, `guess_who`, `turn_based_cut`, `voting`, `shared_grid`, `relay`) on top of the existing-but-dormant `src/features/friends-rooms/*` infrastructure, and flip `ROOMS_DORMANT` to `false` once every mode's lobby → round → results path is built and tested. This is the single largest remaining surface of the 2.0.0 epic.

**Architecture:** The dormant room infra already has a _complete, working Claim-mode implementation_ (`RoomScreen`/`RoomLobby`/`RoomRound`/`RoomItemCard`/`RoomBetween`/`RoomResults`/`useFriendsRoom`/`room-types.ts`) built against the OLD single-mode wire contract (no `mode` concept at all — every room was implicitly Claim). The backend has since replaced that contract with a universal `mode`-carrying `RoomState` (`velanto-backend/src/modules/friends-rooms/types/room.ts`) supporting six modes. This plan: (1) regenerates `room-types.ts` to mirror the new wire contract exactly, (2) extends `useFriendsRoom` with the new commands/events every mode needs, (3) adds a host-only mode picker to the lobby, (4) keeps Claim's existing round/between/results components almost untouched (per the product brief, `docs/multiplayer-modes-redesign.md` §4.3(a): "mostly unchanged... reuse today's `RoomRound`/`RoomItemCard`/`RoomBetween` largely as-is"), and (5) adds one new round-board component per remaining mode, reusing the interaction vocabulary already established by the SOLO play screens (`src/features/play/*`) wherever the interaction shape overlaps (picking one item from a board), plus a small set of new shared primitives (`TurnIndicator`, `LockedInRoster`, `PriorityHolderBadge`, `RoomLeaderboard`) that the design brief calls out as genuinely new UI concepts.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4 (semantic tokens only, see `.claude/docs/design-tokens.md`), socket.io-client, Vitest + RTL, Playwright, next-intl (8 locales: en, zh, hi, ar, bn, ru, ur, uk).

---

## 0. Scope boundary — read this first

### What already exists (do not rebuild from scratch)

Confirmed by direct inspection of `src/features/friends-rooms/*` in this worktree — **this is not a from-zero build**:

| File                                                                                                                  | What it does today                                                                                                                                          | Fate in this plan                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `room-types.ts`                                                                                                       | The OLD wire contract: no `mode`, `RoundState`/`RoomState` shaped only for Claim, `ROOM_EVENTS`/`ROOM_COMMANDS` cover only claim/ready/next/leave/lock/kick | **Rewritten** (Task 1) to mirror the new backend contract exactly                                                                                                          |
| `use-friends-room.ts`                                                                                                 | Socket lifecycle + Claim-only event reducers                                                                                                                | **Extended** (Tasks 2–3) with the new commands/events; existing claim logic untouched                                                                                      |
| `friends-rooms-client.ts`                                                                                             | REST `create`/`join`/`getById`/`mine`                                                                                                                       | Untouched — no REST surface changed for modes (mode is set over the socket)                                                                                                |
| `RoomScreen.tsx`                                                                                                      | Phase switch: `lobby → round → between → finished` (+ `abandoned`/`kicked`)                                                                                 | **Extended** (Task 6) to add the `guessing` phase and delegate `round`/`between` to per-mode dispatchers                                                                   |
| `RoomLobby.tsx`                                                                                                       | Roster, Ready toggle, host Lock + join code                                                                                                                 | **Extended** (Task 5) with the mode picker; roster/Ready/Lock/code untouched                                                                                               |
| `RoomRound.tsx` / `RoomItemCard.tsx` / `RoomBetween.tsx`                                                              | The full Claim board: claim buttons, claimant avatars, survivor reveal                                                                                      | Kept **almost as-is** (Task 10) — only format-aware copy (save vs sacrifice) generalized, since Claim now serves both formats instead of the old single `save_one_friends` |
| `RoomResults.tsx`                                                                                                     | Claim-only results (one block per round, survivor vs sacrificed)                                                                                            | **Generalized** (Task 27) to switch on every `RoundResult.kind`                                                                                                            |
| `RoomKicked.tsx` / `RoomLeaveButton.tsx` / `use-exit-to-pack.ts`                                                      | Terminal states                                                                                                                                             | Untouched — mode-agnostic already                                                                                                                                          |
| `RoomPresenceIndicator.tsx` / `friends-rooms-presence-context.tsx`                                                    | The floating "you're in a room" chip, `/mine` poll                                                                                                          | **Fixed** (Task 7) — its empty-seat math assumes the old fixed `MAX_PLAYERS = 4`, which is wrong once a room can be an 8–12 seat Voting/Guess-who game                     |
| `FriendsRoomEntry.tsx`                                                                                                | Create-room / Join-by-code buttons                                                                                                                          | **Re-mounted** (Task 8) into `PackDetailScreen.tsx` — confirmed by direct grep that it is not imported there today at all (fully unmounted, not just flag-gated)           |
| `JoinCode.tsx` / `JoinByLink.tsx` / `JoinRoomCard.tsx` / `app/rooms/[id]/page.tsx` / `app/rooms/join/[code]/page.tsx` | Stream-safe code reveal, invite-link landing, home-page join card, routes                                                                                   | Untouched — already format/mode-agnostic                                                                                                                                   |
| `ROOMS_DORMANT` (in `room-types.ts`)                                                                                  | `true` — every entry point renders its dead-end state                                                                                                       | **Flipped to `false`** only in the final task (Task 31), after every mode is built and tested                                                                              |

### D1 — No real mock access in this environment; established 2.0.0 component vocabulary stands in for it

`design/extracted/design_handoff_vilante/` is confirmed absent from this session's disk (not a worktree-isolation artifact — the workspace `CLAUDE.md` and two sibling redesign plans this same epic, `docs/superpowers/plans/2026-07-29-docs-page-redesign-plan.md` and the feedback-cluster redesign plan on `feature/2.0.0-feedback-cluster-redesign`, independently hit and documented the same absence). There is also no DesignSync-style fetch tool available. Rather than invent pixel-level UI with no source of truth, this plan is built from three things that **are** verifiable in-repo:

1. **The four already-completed 2.0.0 redesigns' converged component vocabulary** — `Card` (`rounded-card bg-surface-card border-border p-[18px]`), `Badge`, `AvatarStack`, `EmptyState`, `SegmentedControl`, `StatusBadge`, `Modal`/`ConfirmModal`, and the design-token catalog (`.claude/docs/design-tokens.md`) — all confirmed current by direct reads in this session.
2. **The SOLO play screens** (`src/features/play/*`, redesigned this same epic), which already establish exactly the interaction vocabulary the product brief says the multiplayer round screens should extend: `CandidateCard`'s select-one-of-many, `VersusRound`/`HeadToHeadRound`'s two-side pick, `RankPlayScreen`'s click-to-place ranking, `PlayRoundHeader`'s round-progress chrome, `PlayConfirmBar`'s footer action bar.
3. **The product design brief itself**, `docs/multiplayer-modes-redesign.md` (owner-approved, lives in this repo, written specifically to hand this exact rebuild to a designer/engineer with no mock), which already specifies every new UI concept's _behavior_ (mode picker, priority-holder badge, live vote tally, turn indicator, anonymous labels, scored/winner results) even though it does not specify pixel layout.

Where this plan invents a NEW visual pattern with no direct analog in an already-shipped screen (the mode picker cards, the turn indicator, the label-accumulation table, the leaderboard/podium), it says so explicitly and grounds the choice in the existing token catalog (e.g. the podium already has `--medal-gold`/`--medal-silver`/`--medal-bronze` tokens reserved in `design-tokens.md`, unused until now). If a future session gets real mock access and finds a concrete visual mismatch, that is new information this plan did not have — file it separately, exactly as the Docs-page plan's own D1 instructs.

### D2 — Relay needs a genuinely different interaction primitive from the other five modes; it does not reuse "pick one" at all

Five of the six modes (`claim`, `guess_who`, `turn_based_cut`, `voting`, `shared_grid`) are, at the interaction level, **selecting one thing from a fixed set** — a click/tap on a card, exactly what `CandidateCard`/`VersusRound`/`HeadToHeadRound`/`RankPlayScreen`'s click-to-place-next already do. `relay` is not: per `RoundState.relayCurrentItemId`/`relayPlaced`/`relayPlacements` (`velanto-backend/src/modules/friends-rooms/types/room.ts`), the whole room is building **one shared, growing ordered list**, and the player whose turn it is inserts the _current_ item into a **position among the already-placed ones** — an insertion-into-a-list interaction, not a selection-from-a-set one. `RankPlayScreen`'s ranking is the closest existing analog (also builds an ordered list one item at a time) but is solo and always appends to the _end_; Relay's insert can land anywhere in the existing order and is watched live by the whole room. This plan (Task 29) builds a dedicated `RelayInsertBoard.tsx` with **click-a-gap-to-insert** (not drag-and-drop): the same click-based interaction convention `RankPlayScreen` already uses for placement (this codebase has no drag-and-drop anywhere — confirmed by grep — introducing the app's first drag interaction for one mode's one screen would be a bigger, unreviewable visual/interaction bet than this no-mock environment should make; §4.3(f) of the design brief itself only asks for "keeps the 'blind' tension... argue live," not a drag gesture specifically).

### D3 — `ROOMS_DORMANT` stays `true` until every mode is built; flipped exactly once, last

Flipping it early would let real users reach a partially-built mode surface (e.g. Claim done, Relay not) the moment `createRoom` stops 503-ing. The flag only gates _entry points_ (`JoinRoomCard`, the presence poll, `FriendsRoomEntry`'s mount, `JoinByLink`'s redirect) — none of the screens or hooks built in Tasks 1–30 read it, so every mode's components are independently unit-testable throughout without needing the flag flipped. Task 31 flips it once, after Task 30's e2e pass, as the very last step before the final gates (Task 32).

### D4 — The wire contract is rewritten once, up front (Task 1), not incrementally per mode

Every later task depends on the exact shape of `RoundState`/`RoundResult`/`ROOM_EVENTS`. Rewriting `room-types.ts` piecemeal (a field per mode-group) would leave earlier groups temporarily inconsistent with the file's own exports. Task 1 mirrors the backend's `types/room.ts` and `modes/mode.ts` in full, once; every subsequent task only ever imports from the finished file.

### D5 — Per-mode room capacity is NOT on the wire per-room; the frontend needs its own mirrored bounds table

`RoomState.availableModes[]` (`AvailableMode`) carries `{ mode, available, maxPlayers, reason }` — the pack-specific ceiling — but **not** each mode's `minPlayers`, which the lobby's "waiting for N more" copy needs before a mode is even chosen. `minPlayers` is not on any wire type (confirmed: absent from `ModeFeasibility`, `AvailableMode`, and `RoomState`). Exactly like `PACK_FORMATS`/`ROLES`/etc., this is a **closed-set constant hand-mirrored from the backend**, read directly from each mode's descriptor file in `velanto-backend/src/modules/friends-rooms/modes/*/*.descriptor.ts` (confirmed by direct grep this session, not invented):

| Mode             | formats                                                  | minPlayers | maxPlayers |
| ---------------- | -------------------------------------------------------- | ---------- | ---------- |
| `claim`          | save_one, sacrifice_one                                  | 2          | 4          |
| `guess_who`      | save_one, sacrifice_one, rank_blind, nxn, 1v1 (all five) | 3          | 8          |
| `turn_based_cut` | save_one, sacrifice_one                                  | 2          | 6          |
| `voting`         | save_one, sacrifice_one, nxn, 1v1 (NOT rank_blind)       | 2          | 12         |
| `shared_grid`    | rank_blind                                               | 2          | 12         |
| `relay`          | rank_blind                                               | 2          | 6          |

Task 1 adds this as `ROOM_MODE_BOUNDS` in `room-types.ts`, with the same drift-snapshot discipline as every other mirrored constant (Task 1's last step adds the cross-repo-drift test entry).

---

## Group A — Shared infrastructure (wire contract, socket hook, lobby mode picker, presence fix, entry-point re-mount)

### Task 1: Rewrite `room-types.ts` to mirror the new backend wire contract

**Files:**

- Modify: `src/features/friends-rooms/room-types.ts`
- Modify: `src/shared/types/cross-repo-drift.test.ts`

- [ ] **Step 1: Write the failing drift test**

Add to `src/shared/types/cross-repo-drift.test.ts`, inside the existing `describe("cross-repo mirrored constants...")` block (after the `NOTIFICATION_TYPES` test, before the closing `});`):

```ts
// ROOM_MODES — MIRRORED in velanto-backend
// src/modules/friends-rooms/modes/mode.ts. Backend-only until this room-revival
// slice (see that file's own comment); this is the reciprocal FE entry now owed.
it("ROOM_MODES", () => {
  expect([...ROOM_MODES]).toEqual([
    "claim",
    "guess_who",
    "turn_based_cut",
    "voting",
    "shared_grid",
    "relay",
  ]);
});

// ROOM_MODE_BOUNDS — MIRRORED, per-mode, from each mode's own
// velanto-backend src/modules/friends-rooms/modes/*/*.descriptor.ts
// (minPlayers/maxPlayers/formats). Not on the wire (see room-types.ts D5
// comment) so this hand-mirrored table is the only source of truth the FE has
// before a mode is chosen.
it("ROOM_MODE_BOUNDS", () => {
  expect(ROOM_MODE_BOUNDS).toEqual({
    claim: {
      formats: ["save_one", "sacrifice_one"],
      minPlayers: 2,
      maxPlayers: 4,
    },
    guess_who: {
      formats: ["save_one", "sacrifice_one", "rank_blind", "nxn", "1v1"],
      minPlayers: 3,
      maxPlayers: 8,
    },
    turn_based_cut: {
      formats: ["save_one", "sacrifice_one"],
      minPlayers: 2,
      maxPlayers: 6,
    },
    voting: {
      formats: ["save_one", "sacrifice_one", "nxn", "1v1"],
      minPlayers: 2,
      maxPlayers: 12,
    },
    shared_grid: { formats: ["rank_blind"], minPlayers: 2, maxPlayers: 12 },
    relay: { formats: ["rank_blind"], minPlayers: 2, maxPlayers: 6 },
  });
});
```

Add the import at the top of the file, alongside the other type-level imports:

```ts
import {
  ROOM_MODES,
  ROOM_MODE_BOUNDS,
} from "@/src/features/friends-rooms/room-types";
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/shared/types/cross-repo-drift.test.ts`
Expected: FAIL — `ROOM_MODES`/`ROOM_MODE_BOUNDS` are not exported from `room-types.ts` yet.

- [ ] **Step 3: Replace `room-types.ts` in full**

```ts
import type { Item, PackFormat } from "@/src/shared/types/pack";

/**
 * The friends-room wire contract, hand-mirrored from velanto-backend
 * `src/modules/friends-rooms/types/room.ts` and `modes/mode.ts`. Structural
 * wire types, so — like play-results and unlike the closed-set constants —
 * most of this is NOT in the cross-repo drift snapshot; keep it in step with
 * the backend by hand. `ROOM_MODES` and `ROOM_MODE_BOUNDS` (closed sets) ARE
 * snapshotted (see cross-repo-drift.test.ts).
 *
 * A room now carries a MODE: the round mechanic + resolution rule + result
 * shape, chosen by the host in the lobby from `RoomState.availableModes`. See
 * docs/multiplayer-modes-redesign.md for the product brief this mirrors.
 */

/** The mode-agnostic fallback bounds (used only while `mode` is still null —
 * a freshly created room whose pack offers more than one mode). */
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

export const ROOM_MODES = [
  "claim",
  "guess_who",
  "turn_based_cut",
  "voting",
  "shared_grid",
  "relay",
] as const;
export type RoomMode = (typeof ROOM_MODES)[number];

/**
 * Per-mode player bounds and eligible formats — NOT on the wire (a pack's
 * `AvailableMode.maxPlayers` is feasibility-derived and pack-specific;
 * `minPlayers` never travels at all), hand-mirrored from each mode's own
 * `*.descriptor.ts` in velanto-backend. See room-types.ts's own D5 note in
 * the implementation plan for how these were sourced.
 */
export const ROOM_MODE_BOUNDS: Record<
  RoomMode,
  { formats: PackFormat[]; minPlayers: number; maxPlayers: number }
> = {
  claim: {
    formats: ["save_one", "sacrifice_one"],
    minPlayers: 2,
    maxPlayers: 4,
  },
  guess_who: {
    formats: ["save_one", "sacrifice_one", "rank_blind", "nxn", "1v1"],
    minPlayers: 3,
    maxPlayers: 8,
  },
  turn_based_cut: {
    formats: ["save_one", "sacrifice_one"],
    minPlayers: 2,
    maxPlayers: 6,
  },
  voting: {
    formats: ["save_one", "sacrifice_one", "nxn", "1v1"],
    minPlayers: 2,
    maxPlayers: 12,
  },
  shared_grid: { formats: ["rank_blind"], minPlayers: 2, maxPlayers: 12 },
  relay: { formats: ["rank_blind"], minPlayers: 2, maxPlayers: 6 },
};

/** Whether a specific pack can run a mode, and up to what roster size. */
export interface ModeFeasibility {
  available: boolean;
  maxPlayers: number;
  reason?: string;
}

/** A mode offered for a pack's format, with this pack's feasibility folded in. */
export interface AvailableMode extends ModeFeasibility {
  mode: RoomMode;
}

/**
 * Master switch for the whole live-room surface, and the ONE line to flip when
 * rooms return. Every room ENTRY POINT reads this so users are never offered a
 * flow that cannot succeed:
 *
 *  - {@link ../home/JoinRoomCard} renders nothing while dormant;
 *  - {@link ./friends-rooms-presence-context} skips its `/mine` poll;
 *  - {@link ./JoinByLink} (the `/rooms/join/[code]` landing) lands straight on
 *    its "not found" state instead of bouncing a signed-out visitor through
 *    sign-in to a guaranteed 404;
 *  - {@link ../pack/PackDetailScreen} does not render `FriendsRoomEntry`.
 *
 * Flipped to `false` in the final task of the rooms-UI implementation plan,
 * once every mode's lobby/round/results path is built and e2e-verified.
 */
export const ROOMS_DORMANT: boolean = true;

export type FriendsRoomStatus = "lobby" | "playing" | "finished" | "abandoned";

export const ROOM_PHASES = [
  "lobby",
  "round",
  "between",
  /** The interactive Guess-who endgame — assign real players to anonymous
   * labels. Entered only when the room's mode declares one; Claim/Voting/
   * Turn-based-cut/Shared-grid/Relay go straight from `between` to `finished`. */
  "guessing",
  "finished",
  "abandoned",
] as const;
export type RoomPhase = (typeof ROOM_PHASES)[number];

export interface RoomPlayerState {
  userId: string;
  username: string;
  avatarKey: string | null;
  seat: number;
  connected: boolean;
  ready: boolean;
  next: boolean;
  claimedItemId: string | null;
}

export interface RoundState {
  index: number;
  name: string;
  items: Item[];
  /** Claim mode: { [userId]: itemId } as it stands right now. Empty otherwise. */
  claims: Record<string, string>;
  /** Claim mode: null until the round resolves. */
  survivorItemId: string | null;
  /** Guess-who mode: the ids a player selects among, and how. Absent otherwise. */
  optionIds?: string[];
  actionKind?: "pick" | "rank";
  /** Guess-who and Shared-grid: userIds who have locked in a BLIND
   * selection/ranking this round — never the picks/rankings themselves. */
  lockedIn?: string[];
  /** Turn-based cut: the ids still in play, shrinking with every cut. */
  remainingItemIds?: string[];
  /** Turn-based cut: whose turn it is right now, or null once resolved. */
  turnUserId?: string | null;
  /** Turn-based cut: every cut so far THIS round, in order — public. */
  cuts?: { userId: string; itemId: string }[];
  /** Voting: { [userId]: optionId } — live and FULLY PUBLIC (unlike
   * guess-who's blind lockedIn). */
  votes?: Record<string, string>;
  /** Voting: who holds tiebreak priority THIS round. */
  priorityUserId?: string | null;
  /** Relay: the round's fixed item-reveal order, set once at round start. */
  relayOrder?: string[];
  /** Relay: the shared ranking built SO FAR, in final relative order — fully
   * public, grows by one every placement. */
  relayPlaced?: string[];
  /** Relay: the item id currently awaiting placement, or null once every
   * item in the round has been placed. */
  relayCurrentItemId?: string | null;
  /** Relay: every placement so far THIS round, in order — fully public. */
  relayPlacements?: { userId: string; itemId: string }[];
}

/** Claim's resolved round — one unclaimed survivor. */
export interface SurvivorRoundResult {
  kind: "survivor";
  index: number;
  name: string;
  items: Item[];
  claims: Record<string, string>;
  survivorItemId: string;
  /** Turn-based cut: every cut made this round, in order. Undefined for Claim. */
  cuts?: { userId: string; itemId: string }[];
}

/** Guess-who's resolved round — every anonymous label's pick this round, no winner. */
export interface RevealRoundResult {
  kind: "reveal";
  index: number;
  name: string;
  items: Item[];
  /** label -> a length-1 array (pick formats) or the full ordering (rank_blind). */
  picks: Record<string, string[]>;
}

/** Voting's resolved round. */
export interface VoteRoundResult {
  kind: "vote";
  index: number;
  name: string;
  items: Item[];
  optionIds: string[];
  votes: Record<string, string>;
  tally: Record<string, number>;
  winnerOptionId: string;
  tieBroken: boolean;
  priorityUserId: string;
}

/** Shared-grid's resolved round — Borda-aggregated. */
export interface BordaRoundResult {
  kind: "borda";
  index: number;
  name: string;
  items: Item[];
  scores: Record<string, number>;
  /** Descending rank tiers — order[0] is 1st place; a tier holds >1 id on a
   * genuine tie. */
  order: string[][];
  ballots: Record<string, string[]>;
}

/** Relay's resolved round — the one shared ranking the room built together. */
export interface RelayRoundResult {
  kind: "relay";
  index: number;
  name: string;
  items: Item[];
  /** Final shared order, item ids, 1st place first. Never tiered. */
  order: string[];
  placements: { userId: string; itemId: string }[];
}

export type RoundResult =
  | SurvivorRoundResult
  | RevealRoundResult
  | VoteRoundResult
  | BordaRoundResult
  | RelayRoundResult;

/** The live guessing phase's public board. */
export interface GuessingState {
  /** Canonical P1..Pn order (never seat order). */
  labels: string[];
  /** The real userIds a label may be assigned to. */
  candidateUserIds: string[];
  /** Who has submitted. Never the mappings themselves. */
  submitted: string[];
}

/** The endgame reveal's public half — the true mapping only, never anyone's guess. */
export interface PublicEndgameState {
  kind: "identity_reveal";
  mapping: Record<string, string>;
}

export interface RoomState {
  id: string;
  code: string | null;
  packId: string;
  packTitle: string;
  hostId: string;
  status: FriendsRoomStatus;
  phase: RoomPhase;
  locked: boolean;
  /** The mode the host chose in the lobby, or null before one is set. */
  mode: RoomMode | null;
  /** Every mode this pack's format offers, each with this pack's feasibility. */
  availableModes: AvailableMode[];
  maxPlayers: number;
  totalRounds: number;
  roundIndex: number;
  /** Epoch ms the room advances itself, or null. Carries the between-round
   * auto-next deadline OR (in `guessing`) the reveal deadline. */
  autoNextAt: number | null;
  players: RoomPlayerState[];
  round: RoundState | null;
  results: RoundResult[];
  /** The live guessing-phase board, or null outside `phase === 'guessing'`. */
  guessing: GuessingState | null;
  /** The identity reveal once the guessing phase has closed. Null before
   * then, and forever for a mode with no endgame. */
  endgame: PublicEndgameState | null;
  /** THE CALLER'S OWN submitted mapping, and nobody else's. Populated only on
   * the per-caller read (initial `room.state`), never on a room-wide event. */
  myGuess: Record<string, string> | null;
}

export interface MyRoomSummary {
  id: string;
  packTitle: string;
  status: FriendsRoomStatus;
  players: { userId: string; username: string; avatarKey: string | null }[];
}

// ---------------------------------------------------------------- Rejections

export type ClaimRejectionReason =
  "taken" | "too_fast" | "not_in_round" | "round_not_active" | "not_a_player";
export interface ClaimRejection {
  itemId: string;
  reason: ClaimRejectionReason;
  claims: Record<string, string>;
}

export type CutRejectionReason =
  "not_your_turn" | "not_in_round" | "round_not_active" | "not_a_player";
export interface CutRejection {
  itemId: string;
  reason: CutRejectionReason;
  turnUserId: string | null;
}

export type GuessWhoRejectionReason =
  "not_in_round" | "round_not_active" | "not_a_player" | "malformed";
export interface GuessWhoRejection {
  selection: string[];
  reason: GuessWhoRejectionReason;
}

export type VoteRejectionReason =
  "not_in_round" | "round_not_active" | "not_a_player";
export interface VoteRejection {
  optionId: string;
  reason: VoteRejectionReason;
}

export type SharedGridRejectionReason =
  "round_not_active" | "not_a_player" | "malformed";
export interface SharedGridRejection {
  ranking: string[];
  reason: SharedGridRejectionReason;
}

export type RelayRejectionReason =
  "not_your_turn" | "not_in_round" | "round_not_active" | "not_a_player";
export interface RelayRejection {
  itemId: string;
  position: number;
  reason: RelayRejectionReason;
  turnUserId: string | null;
}

export type GuessRejectionReason =
  "not_a_player" | "not_guessing" | "malformed";
export interface GuessRejection {
  mapping: Record<string, string>;
  reason: GuessRejectionReason;
}

/** Server → client event names — must match the backend's ROOM_EVENTS exactly. */
export const ROOM_EVENTS = {
  state: "room.state",
  playerJoined: "player.joined",
  playerLeft: "player.left",
  hostChanged: "host.changed",
  playerKicked: "player.kicked",
  playerReady: "player.ready",
  roomLocked: "room.locked",
  modeChanged: "room.modeChanged",
  roundStarted: "round.started",
  claimUpdated: "claim.updated",
  claimRejected: "claim.rejected",
  itemCut: "item.cut",
  cutRejected: "cut.rejected",
  pickLocked: "pick.locked",
  pickRejected: "pick.rejected",
  voteCast: "vote.cast",
  voteRejected: "vote.rejected",
  rankingLocked: "ranking.locked",
  rankingRejected: "ranking.rejected",
  itemPlaced: "item.placed",
  placeRejected: "place.rejected",
  roundResolved: "round.resolved",
  playerNext: "player.next",
  gameFinished: "game.finished",
  roomClosed: "room.closed",
  guessingStarted: "guessing.started",
  guessSubmitted: "guess.submitted",
  guessRejected: "guess.rejected",
  identityRevealed: "identity.revealed",
} as const;

/** Client → server verbs. */
export const ROOM_COMMANDS = {
  claim: "claim",
  cut: "cut",
  pick: "pick",
  vote: "vote",
  submitRanking: "submitRanking",
  placeItem: "placeItem",
  ready: "ready",
  next: "next",
  leave: "leave",
  lock: "lock",
  kick: "kick",
  setMode: "setMode",
  guess: "guess",
} as const;
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/shared/types/cross-repo-drift.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck to catch every now-broken downstream import**

Run: `npm run typecheck`
Expected: FAIL — `RoomState`/`RoundState`/etc. shape changed underneath every existing consumer (`RoomScreen.tsx`, `RoomLobby.tsx`, `RoomRound.tsx`, `RoomItemCard.tsx`, `RoomBetween.tsx`, `RoomResults.tsx`, `use-friends-room.ts`, their `.test.tsx` files, `RoomPresenceIndicator.tsx`). This is expected — Tasks 2–10 fix each in turn. Do not attempt to fix them all in this task; record the error list so later tasks can be checked off against it.

- [ ] **Step 6: Commit**

```bash
git add src/features/friends-rooms/room-types.ts src/shared/types/cross-repo-drift.test.ts
git commit -m "feat(rooms): rewrite room-types.ts for the universal mode wire contract"
```

### Task 2: Extend `useFriendsRoom` — mode lifecycle (`setMode`, `modeChanged`, `guessing`/`endgame`/`myGuess` in state)

**Files:**

- Modify: `src/features/friends-rooms/use-friends-room.ts`
- Modify: `src/features/friends-rooms/use-friends-room.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `src/features/friends-rooms/use-friends-room.test.tsx` (mirror the file's existing pattern of a fake socket.io-client mock and `act()`-wrapped event emission — read the existing tests for `claim`/`ready` first so the new ones use the identical harness):

```tsx
it("setMode emits the setMode command with the chosen mode", () => {
  const { result } = renderHookWithSocket();
  act(() => {
    result.current.setMode("voting");
  });
  expect(emittedCommands()).toContainEqual(["setMode", { mode: "voting" }]);
});

it("room.modeChanged updates state.mode", () => {
  const { result, emit } = renderHookWithSocket();
  act(() => emit(ROOM_EVENTS.state, baseRoomState({ mode: null })));
  act(() => emit(ROOM_EVENTS.modeChanged, { mode: "guess_who" }));
  expect(result.current.state?.mode).toBe("guess_who");
});

it("guessing.started sets phase to guessing and populates state.guessing", () => {
  const { result, emit } = renderHookWithSocket();
  act(() => emit(ROOM_EVENTS.state, baseRoomState({ mode: "guess_who" })));
  act(() =>
    emit(ROOM_EVENTS.guessingStarted, {
      labels: ["P1", "P2", "P3"],
      candidateUserIds: ["u1", "u2", "u3"],
      deadlineAt: Date.now() + 90_000,
    }),
  );
  expect(result.current.state?.phase).toBe("guessing");
  expect(result.current.state?.guessing?.labels).toEqual(["P1", "P2", "P3"]);
  expect(result.current.state?.guessing?.submitted).toEqual([]);
});

it("guess.submitted appends the submitter without leaking their mapping", () => {
  const { result, emit } = renderHookWithSocket();
  act(() =>
    emit(
      ROOM_EVENTS.state,
      baseRoomState({ mode: "guess_who", phase: "guessing" }),
    ),
  );
  act(() => emit(ROOM_EVENTS.guessSubmitted, { userId: "u1" }));
  expect(result.current.state?.guessing?.submitted).toEqual(["u1"]);
});

it("identity.revealed sets state.endgame and state.myGuess from the per-player payload", () => {
  const { result, emit } = renderHookWithSocket();
  act(() =>
    emit(
      ROOM_EVENTS.state,
      baseRoomState({ mode: "guess_who", phase: "guessing" }),
    ),
  );
  act(() =>
    emit(ROOM_EVENTS.identityRevealed, {
      mapping: { P1: "u1", P2: "u2" },
      yourGuess: { P1: "u2", P2: "u1" },
    }),
  );
  expect(result.current.state?.phase).toBe("finished");
  expect(result.current.state?.endgame).toEqual({
    kind: "identity_reveal",
    mapping: { P1: "u1", P2: "u2" },
  });
  expect(result.current.state?.myGuess).toEqual({ P1: "u2", P2: "u1" });
});

it("guess emits the guess command with the submitted mapping", () => {
  const { result } = renderHookWithSocket();
  act(() => result.current.guess({ P1: "u2", P2: "u1" }));
  expect(emittedCommands()).toContainEqual([
    "guess",
    { mapping: { P1: "u2", P2: "u1" } },
  ]);
});
```

(`baseRoomState`, `renderHookWithSocket`, `emittedCommands` are the file's own existing test helpers — extend `baseRoomState`'s default fixture with `mode: null, availableModes: [], guessing: null, endgame: null, myGuess: null` so every pre-existing test in the file keeps compiling against the new required `RoomState` fields.)

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npm test -- src/features/friends-rooms/use-friends-room.test.tsx`
Expected: FAIL — `result.current.setMode`/`.guess` are not functions yet; `ROOM_EVENTS.modeChanged`/`.guessingStarted`/etc. handlers don't exist on the socket yet, so `state.mode`/`.guessing`/`.endgame`/`.myGuess` stay at their initial values.

- [ ] **Step 3: Implement**

In `src/features/friends-rooms/use-friends-room.ts`, extend the `FriendsRoom` interface:

```ts
export interface FriendsRoom {
  state: RoomState | null;
  connection: RoomConnection;
  lastRejection: ClaimRejection | null;
  kicked: boolean;
  claim: (itemId: string) => void;
  ready: () => void;
  next: () => void;
  lock: (locked: boolean) => void;
  leave: () => void;
  kick: (userId: string) => void;
  /** Host-only: choose (or change, in the lobby) the room's mode. */
  setMode: (mode: RoomMode) => void;
  /** Guess-who endgame: submit a label -> real-player mapping. */
  guess: (mapping: Record<string, string>) => void;
}
```

Add the import for `RoomMode` at the top alongside the existing `room-types` imports.

Inside the `useEffect` that wires up socket listeners, add the new handlers right after the existing `roomLocked` handler:

```ts
socket.on(ROOM_EVENTS.modeChanged, ({ mode }: { mode: RoomMode }) =>
  setState((s) => (s ? { ...s, mode } : s)),
);

socket.on(
  ROOM_EVENTS.guessingStarted,
  ({
    labels,
    candidateUserIds,
    deadlineAt,
  }: {
    labels: string[];
    candidateUserIds: string[];
    deadlineAt: number;
  }) =>
    setState((s) =>
      s
        ? {
            ...s,
            phase: "guessing",
            autoNextAt: deadlineAt,
            guessing: { labels, candidateUserIds, submitted: [] },
          }
        : s,
    ),
);

socket.on(ROOM_EVENTS.guessSubmitted, ({ userId }: { userId: string }) =>
  setState((s) =>
    s && s.guessing
      ? {
          ...s,
          guessing: {
            ...s.guessing,
            submitted: s.guessing.submitted.includes(userId)
              ? s.guessing.submitted
              : [...s.guessing.submitted, userId],
          },
        }
      : s,
  ),
);

socket.on(
  ROOM_EVENTS.identityRevealed,
  ({
    mapping,
    yourGuess,
  }: {
    mapping: Record<string, string>;
    yourGuess: Record<string, string> | null;
  }) =>
    setState((s) =>
      s
        ? {
            ...s,
            phase: "finished",
            autoNextAt: null,
            endgame: { kind: "identity_reveal", mapping },
            myGuess: yourGuess,
          }
        : s,
    ),
);
```

Extend the hook's return object:

```ts
    setMode: useCallback(
      (mode: RoomMode) => send(ROOM_COMMANDS.setMode, { mode }),
      [send],
    ),
    guess: useCallback(
      (mapping: Record<string, string>) =>
        send(ROOM_COMMANDS.guess, { mapping }),
      [send],
    ),
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npm test -- src/features/friends-rooms/use-friends-room.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/friends-rooms/use-friends-room.ts src/features/friends-rooms/use-friends-room.test.tsx
git commit -m "feat(rooms): wire mode lifecycle + guess-who endgame events into useFriendsRoom"
```

### Task 3: Extend `useFriendsRoom` — per-mode round actions (`cut`, `pick`, `vote`, `submitRanking`, `placeItem`) and their public/lock/reject events

**Files:**

- Modify: `src/features/friends-rooms/use-friends-room.ts`
- Modify: `src/features/friends-rooms/use-friends-room.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `use-friends-room.test.tsx`:

```tsx
it("cut/pick/vote/submitRanking/placeItem emit their commands", () => {
  const { result } = renderHookWithSocket();
  act(() => result.current.cut("item-1"));
  act(() => result.current.pick(["item-2"]));
  act(() => result.current.vote("item-3"));
  act(() => result.current.submitRanking(["item-1", "item-2"]));
  act(() => result.current.placeItem("item-4", 1));
  expect(emittedCommands()).toEqual(
    expect.arrayContaining([
      ["cut", { itemId: "item-1" }],
      ["pick", { selection: ["item-2"] }],
      ["vote", { optionId: "item-3" }],
      ["submitRanking", { ranking: ["item-1", "item-2"] }],
      ["placeItem", { itemId: "item-4", position: 1 }],
    ]),
  );
});

it("item.cut updates round.remainingItemIds, cuts, and turnUserId", () => {
  const { result, emit } = renderHookWithSocket();
  act(() =>
    emit(
      ROOM_EVENTS.state,
      baseRoomState({
        mode: "turn_based_cut",
        phase: "round",
        round: {
          index: 0,
          name: "",
          items: [],
          claims: {},
          survivorItemId: null,
          remainingItemIds: ["a", "b", "c"],
          turnUserId: "u1",
          cuts: [],
        },
      }),
    ),
  );
  act(() =>
    emit(ROOM_EVENTS.itemCut, { userId: "u1", itemId: "a", turnUserId: "u2" }),
  );
  expect(result.current.state?.round?.remainingItemIds).toEqual(["b", "c"]);
  expect(result.current.state?.round?.cuts).toEqual([
    { userId: "u1", itemId: "a" },
  ]);
  expect(result.current.state?.round?.turnUserId).toBe("u2");
});

it("pick.locked adds the userId to round.lockedIn without leaking the selection", () => {
  const { result, emit } = renderHookWithSocket();
  act(() =>
    emit(
      ROOM_EVENTS.state,
      baseRoomState({
        mode: "guess_who",
        phase: "round",
        round: {
          index: 0,
          name: "",
          items: [],
          claims: {},
          survivorItemId: null,
          optionIds: ["a", "b"],
          actionKind: "pick",
          lockedIn: [],
        },
      }),
    ),
  );
  act(() => emit(ROOM_EVENTS.pickLocked, { userId: "u1" }));
  expect(result.current.state?.round?.lockedIn).toEqual(["u1"]);
});

it("vote.cast updates round.votes (fully public, unlike pick.locked)", () => {
  const { result, emit } = renderHookWithSocket();
  act(() =>
    emit(
      ROOM_EVENTS.state,
      baseRoomState({
        mode: "voting",
        phase: "round",
        round: {
          index: 0,
          name: "",
          items: [],
          claims: {},
          survivorItemId: null,
          optionIds: ["a", "b"],
          votes: {},
          priorityUserId: "u1",
        },
      }),
    ),
  );
  act(() => emit(ROOM_EVENTS.voteCast, { userId: "u2", optionId: "a" }));
  expect(result.current.state?.round?.votes).toEqual({ u2: "a" });
});

it("ranking.locked adds the userId to round.lockedIn", () => {
  const { result, emit } = renderHookWithSocket();
  act(() =>
    emit(
      ROOM_EVENTS.state,
      baseRoomState({
        mode: "shared_grid",
        phase: "round",
        round: {
          index: 0,
          name: "",
          items: [],
          claims: {},
          survivorItemId: null,
          optionIds: ["a", "b"],
          lockedIn: [],
        },
      }),
    ),
  );
  act(() => emit(ROOM_EVENTS.rankingLocked, { userId: "u1" }));
  expect(result.current.state?.round?.lockedIn).toEqual(["u1"]);
});

it("item.placed updates relayPlaced, relayPlacements, relayCurrentItemId and turn", () => {
  const { result, emit } = renderHookWithSocket();
  act(() =>
    emit(
      ROOM_EVENTS.state,
      baseRoomState({
        mode: "relay",
        phase: "round",
        round: {
          index: 0,
          name: "",
          items: [],
          claims: {},
          survivorItemId: null,
          relayOrder: ["a", "b"],
          relayPlaced: [],
          relayCurrentItemId: "a",
          relayPlacements: [],
        },
      }),
    ),
  );
  act(() =>
    emit(ROOM_EVENTS.itemPlaced, {
      userId: "u1",
      itemId: "a",
      position: 0,
      turnUserId: "u2",
    }),
  );
  expect(result.current.state?.round?.relayPlaced).toEqual(["a"]);
  expect(result.current.state?.round?.relayPlacements).toEqual([
    { userId: "u1", itemId: "a" },
  ]);
  expect(result.current.state?.round?.relayCurrentItemId).toBe("b");
});

it("cutRejected/pickRejected/voteRejected/rankingRejected/placeRejected all store the actor's lastRejection without crashing on other modes' state", () => {
  const { result, emit } = renderHookWithSocket();
  act(() => emit(ROOM_EVENTS.state, baseRoomState({ mode: "turn_based_cut" })));
  act(() =>
    emit(ROOM_EVENTS.cutRejected, {
      itemId: "a",
      reason: "not_your_turn",
      turnUserId: "u2",
    }),
  );
  expect(result.current.lastModeRejection).toEqual({
    itemId: "a",
    reason: "not_your_turn",
    turnUserId: "u2",
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npm test -- src/features/friends-rooms/use-friends-room.test.tsx`
Expected: FAIL — the new commands/event handlers do not exist.

- [ ] **Step 3: Implement**

Extend `FriendsRoom` further:

```ts
  cut: (itemId: string) => void;
  pick: (selection: string[]) => void;
  vote: (optionId: string) => void;
  submitRanking: (ranking: string[]) => void;
  placeItem: (itemId: string, position: number) => void;
  /** The most recent per-mode action rejection (cut/pick/vote/ranking/place),
   * kept distinct from `lastRejection` (Claim's own) so a mode never has to
   * guess which shape a shared field holds. */
  lastModeRejection:
    | (CutRejection & { kind: "cut" })
    | (GuessWhoRejection & { kind: "pick" })
    | (VoteRejection & { kind: "vote" })
    | (SharedGridRejection & { kind: "ranking" })
    | (RelayRejection & { kind: "place" })
    | null;
```

Add a new piece of state alongside `lastRejection`:

```ts
const [lastModeRejection, setLastModeRejection] =
  useState<FriendsRoom["lastModeRejection"]>(null);
```

Add the round-scoped update helper (place it near `patchPlayer`/`patchPlayers` at the bottom of the file):

```ts
type SetState2 = React.Dispatch<React.SetStateAction<RoomState | null>>;

function patchRound(setState: SetState2, patch: Partial<RoundState>) {
  setState((s) =>
    s && s.round ? { ...s, round: { ...s.round, ...patch } } : s,
  );
}
```

Inside the listener-registration `useEffect`, add:

```ts
socket.on(
  ROOM_EVENTS.itemCut,
  ({
    userId,
    itemId,
    turnUserId,
  }: {
    userId: string | null;
    itemId: string | null;
    turnUserId: string | null;
  }) =>
    setState((s) => {
      if (!s || !s.round) return s;
      const remainingItemIds = itemId
        ? (s.round.remainingItemIds ?? []).filter((id) => id !== itemId)
        : s.round.remainingItemIds;
      const cuts =
        userId && itemId
          ? [...(s.round.cuts ?? []), { userId, itemId }]
          : s.round.cuts;
      return {
        ...s,
        round: { ...s.round, remainingItemIds, cuts, turnUserId },
      };
    }),
);
socket.on(ROOM_EVENTS.cutRejected, (rejection: CutRejection) =>
  setLastModeRejection({ ...rejection, kind: "cut" }),
);

socket.on(ROOM_EVENTS.pickLocked, ({ userId }: { userId: string }) =>
  patchRound(setState, {
    lockedIn: state?.round?.lockedIn?.includes(userId)
      ? state.round.lockedIn
      : [...(state?.round?.lockedIn ?? []), userId],
  }),
);
socket.on(ROOM_EVENTS.pickRejected, (rejection: GuessWhoRejection) =>
  setLastModeRejection({ ...rejection, kind: "pick" }),
);

socket.on(
  ROOM_EVENTS.voteCast,
  ({ userId, optionId }: { userId: string; optionId: string }) =>
    setState((s) =>
      s && s.round
        ? {
            ...s,
            round: {
              ...s.round,
              votes: { ...s.round.votes, [userId]: optionId },
            },
          }
        : s,
    ),
);
socket.on(ROOM_EVENTS.voteRejected, (rejection: VoteRejection) =>
  setLastModeRejection({ ...rejection, kind: "vote" }),
);

socket.on(ROOM_EVENTS.rankingLocked, ({ userId }: { userId: string }) =>
  setState((s) =>
    s && s.round
      ? {
          ...s,
          round: {
            ...s.round,
            lockedIn: s.round.lockedIn?.includes(userId)
              ? s.round.lockedIn
              : [...(s.round.lockedIn ?? []), userId],
          },
        }
      : s,
  ),
);
socket.on(ROOM_EVENTS.rankingRejected, (rejection: SharedGridRejection) =>
  setLastModeRejection({ ...rejection, kind: "ranking" }),
);

socket.on(
  ROOM_EVENTS.itemPlaced,
  ({
    userId,
    itemId,
    position,
    turnUserId,
  }: {
    userId: string | null;
    itemId: string | null;
    position?: number;
    turnUserId: string | null;
  }) =>
    setState((s) => {
      if (!s || !s.round) return s;
      const relayPlaced =
        itemId && s.round.relayPlaced
          ? [...s.round.relayPlaced, itemId]
          : s.round.relayPlaced;
      const relayPlacements =
        userId && itemId
          ? [...(s.round.relayPlacements ?? []), { userId, itemId }]
          : s.round.relayPlacements;
      const remainingOrder = s.round.relayOrder?.filter(
        (id) => !(relayPlaced ?? []).includes(id),
      );
      return {
        ...s,
        round: {
          ...s.round,
          relayPlaced,
          relayPlacements,
          relayCurrentItemId: remainingOrder?.[0] ?? null,
        },
      };
    }),
);
socket.on(ROOM_EVENTS.placeRejected, (rejection: RelayRejection) =>
  setLastModeRejection({ ...rejection, kind: "place" }),
);
```

> Note the `pickLocked` handler above reads `state` directly rather than through the `setState` updater — mirror the codebase's existing convention instead (see `patchRound`'s pure updater-function form) to avoid a stale-closure bug: replace that one handler with `patchRound`-style logic identical to `rankingLocked`'s, i.e.
>
> ```ts
> socket.on(ROOM_EVENTS.pickLocked, ({ userId }: { userId: string }) =>
>   setState((s) =>
>     s && s.round
>       ? {
>           ...s,
>           round: {
>             ...s.round,
>             lockedIn: s.round.lockedIn?.includes(userId)
>               ? s.round.lockedIn
>               : [...(s.round.lockedIn ?? []), userId],
>           },
>         }
>       : s,
>   ),
> );
> ```

Extend the returned object:

```ts
    cut: useCallback((itemId) => send(ROOM_COMMANDS.cut, { itemId }), [send]),
    pick: useCallback(
      (selection) => send(ROOM_COMMANDS.pick, { selection }),
      [send],
    ),
    vote: useCallback(
      (optionId) => send(ROOM_COMMANDS.vote, { optionId }),
      [send],
    ),
    submitRanking: useCallback(
      (ranking) => send(ROOM_COMMANDS.submitRanking, { ranking }),
      [send],
    ),
    placeItem: useCallback(
      (itemId, position) =>
        send(ROOM_COMMANDS.placeItem, { itemId, position }),
      [send],
    ),
    lastModeRejection,
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npm test -- src/features/friends-rooms/use-friends-room.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/friends-rooms/use-friends-room.ts src/features/friends-rooms/use-friends-room.test.tsx
git commit -m "feat(rooms): wire per-mode round action commands + events into useFriendsRoom"
```

### Task 4: `room-mode-copy.ts` — per-mode display name, blurb, and format-aware verb helper

**Files:**

- Create: `src/features/friends-rooms/room-mode-copy.ts`
- Create: `src/features/friends-rooms/room-mode-copy.test.ts`

Mirrors the existing `src/features/play/play-format-copy.ts` pattern (`Record<T, i18nKey>` lookup tables) — every mode picker card, every round header, and Claim's own save/sacrifice-aware copy (Task 10) reads from this one file rather than each screen re-deriving its own key.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import {
  MODE_NAME_KEY,
  MODE_BLURB_KEY,
  MODE_ICON,
  claimVerbKey,
} from "./room-mode-copy";
import { ROOM_MODES } from "./room-types";
import { PACK_FORMATS } from "@/src/shared/types/pack";

describe("room-mode-copy", () => {
  it("has a name and blurb key for every mode", () => {
    for (const mode of ROOM_MODES) {
      expect(MODE_NAME_KEY[mode]).toBeTruthy();
      expect(MODE_BLURB_KEY[mode]).toBeTruthy();
      expect(MODE_ICON[mode]).toBeTruthy();
    }
  });

  it("claimVerbKey flips between save_one and sacrifice_one", () => {
    expect(claimVerbKey("save_one")).toBe("claimVerbSave");
    expect(claimVerbKey("sacrifice_one")).toBe("claimVerbSacrifice");
  });

  it("claimVerbKey is total over every PackFormat (exhaustiveness)", () => {
    for (const format of PACK_FORMATS) {
      expect(() => claimVerbKey(format)).not.toThrow();
    }
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/room-mode-copy.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
import type { Pack } from "@/src/shared/types/pack";
import type { RoomMode } from "./room-types";

/** The mode picker card's title — `room.modes.<mode>.name` in the `room` catalog. */
export const MODE_NAME_KEY: Record<RoomMode, string> = {
  claim: "modes.claim.name",
  guess_who: "modes.guess_who.name",
  turn_based_cut: "modes.turn_based_cut.name",
  voting: "modes.voting.name",
  shared_grid: "modes.shared_grid.name",
  relay: "modes.relay.name",
};

/** The mode picker card's one-line blurb. */
export const MODE_BLURB_KEY: Record<RoomMode, string> = {
  claim: "modes.claim.blurb",
  guess_who: "modes.guess_who.blurb",
  turn_based_cut: "modes.turn_based_cut.blurb",
  voting: "modes.voting.blurb",
  shared_grid: "modes.shared_grid.blurb",
  relay: "modes.relay.blurb",
};

/** lucide-react icon name per mode, for the mode picker card. Resolved by the
 * caller (ModePicker.tsx) — kept as a string here, not a component reference,
 * so this stays a plain data module with no React/JSX dependency. */
export const MODE_ICON: Record<RoomMode, string> = {
  claim: "Swords",
  guess_who: "Users",
  turn_based_cut: "Scissors",
  voting: "Vote",
  shared_grid: "LayoutGrid",
  relay: "Repeat",
};

/**
 * Claim now serves both save_one and sacrifice_one packs (it used to be
 * exclusively the save_one_friends format's one gameplay) — the verb the
 * board/results copy uses ("Save" vs "Sacrifice") must follow the PACK's
 * format, exactly like the solo play screens' own CHOSEN_LABEL_KEY
 * (src/features/play/play-format-copy.ts). Every format needs a key for
 * Record<PackFormat, ...>'s exhaustiveness even though only Claim's two
 * formats ever reach this helper.
 */
const CLAIM_VERB_KEY: Record<Pack["format"], string> = {
  save_one: "claimVerbSave",
  sacrifice_one: "claimVerbSacrifice",
  nxn: "",
  rank_blind: "",
  "1v1": "",
};

export function claimVerbKey(format: Pack["format"]): string {
  return CLAIM_VERB_KEY[format];
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/room-mode-copy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/friends-rooms/room-mode-copy.ts src/features/friends-rooms/room-mode-copy.test.ts
git commit -m "feat(rooms): add per-mode display copy + Claim's format-aware verb helper"
```

### Task 5: `ModePicker.tsx` — host mode selection + guest read-only summary

**Files:**

- Create: `src/features/friends-rooms/ModePicker.tsx`
- Create: `src/features/friends-rooms/ModePicker.test.tsx`
- Modify: `src/features/friends-rooms/RoomLobby.tsx`
- Modify: `src/features/friends-rooms/RoomLobby.test.tsx`

Per the design brief §3.1/§4.2: a set of mode cards (name, one-line blurb, player range, enabled/disabled with a reason), host-only to click, read-only for guests. Uses `Card` (interactive for the host's clickable cards) — the established selectable-card pattern already used by `CandidateCard`'s selected/unselected frame states (`FRAME_SELECTED`/`FRAME_UNSELECTED` classes), adapted to a picker rather than a per-round choice.

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ModePicker } from "./ModePicker";
import type { AvailableMode } from "./room-types";

const AVAILABLE: AvailableMode[] = [
  { mode: "claim", available: true, maxPlayers: 4 },
  {
    mode: "guess_who",
    available: false,
    maxPlayers: 0,
    reason: "Needs at least 5 playable rounds",
  },
];

describe("ModePicker", () => {
  it("host: renders every available mode as a clickable card and calls onChange", async () => {
    const onChange = vi.fn();
    render(
      <ModePicker
        availableModes={AVAILABLE}
        selectedMode={null}
        isHost
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Claim/i }));
    expect(onChange).toHaveBeenCalledWith("claim");
  });

  it("host: an unavailable mode's card is disabled and shows its reason", () => {
    render(
      <ModePicker
        availableModes={AVAILABLE}
        selectedMode={null}
        isHost
        onChange={vi.fn()}
      />,
    );
    const guessWho = screen.getByRole("button", { name: /Guess Who/i });
    expect(guessWho).toBeDisabled();
    expect(
      screen.getByText("Needs at least 5 playable rounds"),
    ).toBeInTheDocument();
  });

  it("guest: renders the selected mode read-only, no buttons", () => {
    render(
      <ModePicker
        availableModes={AVAILABLE}
        selectedMode="claim"
        isHost={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/Claim/i)).toBeInTheDocument();
  });

  it("guest: no mode chosen yet shows a waiting note, not an empty picker", () => {
    render(
      <ModePicker
        availableModes={AVAILABLE}
        selectedMode={null}
        isHost={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/host is choosing/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/ModePicker.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Check, Circle } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { MODE_NAME_KEY, MODE_BLURB_KEY } from "./room-mode-copy";
import {
  ROOM_MODE_BOUNDS,
  type AvailableMode,
  type RoomMode,
} from "./room-types";

interface ModePickerProps {
  availableModes: AvailableMode[];
  selectedMode: RoomMode | null;
  isHost: boolean;
  onChange: (mode: RoomMode) => void;
}

/**
 * The lobby's mode picker (design brief §3.1/§4.2). Host-only to click; guests
 * see a read-only summary of whichever mode is (or isn't yet) chosen. A mode
 * with `available: false` (this pack can't feasibly run it — too-small pools,
 * too few rounds) renders disabled with its one-line `reason`, never hidden —
 * the host should see every mode this format COULD offer, and why some are
 * currently out of reach.
 */
export function ModePicker({
  availableModes,
  selectedMode,
  isHost,
  onChange,
}: ModePickerProps) {
  const t = useTranslations("room");

  if (!isHost) {
    const chosen = availableModes.find((m) => m.mode === selectedMode);
    return (
      <section
        aria-label={t("modePicker.heading")}
        className="flex flex-col gap-2"
      >
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("modePicker.heading")}
        </Text>
        {chosen ? (
          <div className="flex flex-col gap-1 rounded-tile border border-acc/40 bg-acc/[0.06] p-4">
            <Text className="text-sm font-semibold">
              {t(MODE_NAME_KEY[chosen.mode])}
            </Text>
            <Text variant="secondary" className="text-xs">
              {t(MODE_BLURB_KEY[chosen.mode])}
            </Text>
          </div>
        ) : (
          <Text variant="secondary" className="text-sm">
            {t("modePicker.hostIsChoosing")}
          </Text>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label={t("modePicker.heading")}
      className="flex flex-col gap-3"
    >
      <Text variant="tertiary" className="text-xs uppercase tracking-wide">
        {t("modePicker.heading")}
      </Text>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {availableModes.map((entry) => {
          const selected = entry.mode === selectedMode;
          const bounds = ROOM_MODE_BOUNDS[entry.mode];
          return (
            <button
              key={entry.mode}
              type="button"
              disabled={!entry.available}
              aria-pressed={selected}
              onClick={() => onChange(entry.mode)}
              className={cn(
                "flex flex-col gap-2 rounded-card border-[1.5px] p-4 text-start transition-colors",
                selected
                  ? "border-acc bg-acc/[0.08] ring-[3px] ring-acc/20"
                  : entry.available
                    ? "border-border bg-surface hover:border-border-strong"
                    : "cursor-not-allowed border-border bg-surface/40 opacity-60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Text className="text-sm font-semibold">
                  {t(MODE_NAME_KEY[entry.mode])}
                </Text>
                {selected ? (
                  <Check size={16} aria-hidden className="text-acc" />
                ) : (
                  <Circle
                    size={14}
                    aria-hidden
                    className="text-foreground-tertiary"
                  />
                )}
              </div>
              <Text variant="secondary" className="text-xs">
                {t(MODE_BLURB_KEY[entry.mode])}
              </Text>
              <Text variant="tertiary" className="text-[11px]">
                {entry.available
                  ? t("modePicker.playerRange", {
                      min: bounds.minPlayers,
                      max: entry.maxPlayers,
                    })
                  : entry.reason}
              </Text>
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/ModePicker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire it into `RoomLobby.tsx`**

Add the import and the `<ModePicker>` render just above the existing roster `<section>`, and add `mode`/`availableModes`/`onSetMode` to `RoomLobbyProps`:

```tsx
import { ModePicker } from "./ModePicker";
```

```tsx
interface RoomLobbyProps {
  state: RoomState;
  currentUserId: string | null;
  onReady: () => void;
  onLock: (locked: boolean) => void;
  onKick: (userId: string) => void;
  /** Host-only: change the room's mode. */
  onSetMode: (mode: RoomMode) => void;
}
```

Inside the component, right after `const isHost = ...`:

```tsx
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("lobby.heading")}
        </Text>
      </header>

      <ModePicker
        availableModes={state.availableModes}
        selectedMode={state.mode}
        isHost={isHost}
        onChange={onSetMode}
      />

      <section aria-label={t("lobby.roster")} className="flex flex-col gap-3">
```

(Everything from `<section aria-label={t("lobby.roster")}>` onward is unchanged — only the new `<ModePicker>` block is inserted before it, and the duplicate `<header>` that used to open the return is removed since it now sits above the picker instead of alone.)

Update `RoomLobby.test.tsx`'s existing render helper to pass `onSetMode: vi.fn()` (every existing test that renders `<RoomLobby>` needs this new required prop or it fails to compile) and `state.availableModes`/`state.mode` in its `RoomState` fixture.

- [ ] **Step 6: Run RoomLobby's tests, confirm they still pass**

Run: `npm test -- src/features/friends-rooms/RoomLobby.test.tsx`
Expected: PASS (no new test needed here — Step 1's `ModePicker.test.tsx` already covers the picker's own behavior; this step only re-verifies the host prop-threading compiles and renders).

- [ ] **Step 7: Commit**

```bash
git add src/features/friends-rooms/ModePicker.tsx src/features/friends-rooms/ModePicker.test.tsx src/features/friends-rooms/RoomLobby.tsx src/features/friends-rooms/RoomLobby.test.tsx
git commit -m "feat(rooms): add the lobby mode picker (host select / guest read-only)"
```

### Task 6: `RoomScreen.tsx` — route `round`/`between` per mode, add the `guessing` phase

**Files:**

- Modify: `src/features/friends-rooms/RoomScreen.tsx`
- Modify: `src/features/friends-rooms/RoomScreen.test.tsx`
- Create: `src/features/friends-rooms/RoomRoundBoard.tsx`
- Create: `src/features/friends-rooms/RoomRoundBoard.test.tsx`
- Create: `src/features/friends-rooms/RoomBetweenBoard.tsx`
- Create: `src/features/friends-rooms/RoomBetweenBoard.test.tsx`

`RoomRoundBoard`/`RoomBetweenBoard` are thin `switch (state.mode)` dispatchers — kept separate from `RoomScreen` itself so each mode group (Tasks 9–27) only ever touches its own board component and this one small switch, never `RoomScreen`'s phase logic again. Claim's arm renders the EXISTING `RoomRound`/`RoomBetween` unchanged (Task 9 only touches their copy, not their shape); every other mode's arm is `null` until that mode's group lands, and is filled in by that group's own task (this task only adds the `case` and wires the switch — Tasks 12/18/21/23/25 fill in each mode's round board, Tasks 13/19/22/24/26 each mode's between board).

- [ ] **Step 1: Write the failing tests for the dispatchers**

`src/features/friends-rooms/RoomRoundBoard.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomRoundBoard } from "./RoomRoundBoard";
import { baseRoomState } from "./test-fixtures";

describe("RoomRoundBoard", () => {
  it("mode claim renders the claim board (RoomRound)", () => {
    render(
      <RoomRoundBoard
        state={baseRoomState({
          mode: "claim",
          round: {
            index: 0,
            name: "",
            items: [
              { id: "i1", title: "Item 1", type: "text", value: "Item 1" },
            ],
            claims: {},
            survivorItemId: null,
          },
        })}
        currentUserId="u1"
        actions={{} as never}
      />,
    );
    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });

  it("mode null renders nothing (defensive — a round should never start with no mode)", () => {
    const { container } = render(
      <RoomRoundBoard
        state={baseRoomState({ mode: null })}
        currentUserId="u1"
        actions={{} as never}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

Create `src/features/friends-rooms/test-fixtures.ts` (a small shared builder every new test file in this feature imports, replacing each file's own ad hoc inline fixture):

```ts
import type { RoomState } from "./room-types";

export function baseRoomState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    id: "room-1",
    code: "ABC123",
    packId: "pack-1",
    packTitle: "Test Pack",
    hostId: "u1",
    status: "playing",
    phase: "round",
    locked: false,
    mode: "claim",
    availableModes: [{ mode: "claim", available: true, maxPlayers: 4 }],
    maxPlayers: 4,
    totalRounds: 3,
    roundIndex: 0,
    autoNextAt: null,
    players: [
      {
        userId: "u1",
        username: "Alice",
        avatarKey: null,
        seat: 0,
        connected: true,
        ready: true,
        next: false,
        claimedItemId: null,
      },
      {
        userId: "u2",
        username: "Bob",
        avatarKey: null,
        seat: 1,
        connected: true,
        ready: true,
        next: false,
        claimedItemId: null,
      },
    ],
    round: null,
    results: [],
    guessing: null,
    endgame: null,
    myGuess: null,
    ...overrides,
  };
}
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npm test -- src/features/friends-rooms/RoomRoundBoard.test.tsx`
Expected: FAIL — `RoomRoundBoard`/`test-fixtures` don't exist.

- [ ] **Step 3: Implement `RoomRoundBoard.tsx`**

```tsx
"use client";

import type {
  ClaimRejection,
  CutRejection,
  GuessWhoRejection,
  RelayRejection,
  RoomState,
  SharedGridRejection,
  VoteRejection,
} from "./room-types";
import { RoomRound } from "./RoomRound";

/** Every round-scoped action a board might need, keyed by mode so each board
 * only destructures what its own mode uses. */
export interface RoomRoundActions {
  claim: (itemId: string) => void;
  cut: (itemId: string) => void;
  pick: (selection: string[]) => void;
  vote: (optionId: string) => void;
  submitRanking: (ranking: string[]) => void;
  placeItem: (itemId: string, position: number) => void;
  lastRejection: ClaimRejection | null;
  lastModeRejection:
    | (CutRejection & { kind: "cut" })
    | (GuessWhoRejection & { kind: "pick" })
    | (VoteRejection & { kind: "vote" })
    | (SharedGridRejection & { kind: "ranking" })
    | (RelayRejection & { kind: "place" })
    | null;
}

interface RoomRoundBoardProps {
  state: RoomState;
  currentUserId: string | null;
  actions: RoomRoundActions;
}

/**
 * The `phase === 'round'` dispatcher — switches on `state.mode` to the right
 * board. Claim's arm is the existing, unchanged `RoomRound`; every other
 * mode's board is added by that mode's own task group (Tasks 13/19/22/26/29).
 */
export function RoomRoundBoard({
  state,
  currentUserId,
  actions,
}: RoomRoundBoardProps) {
  switch (state.mode) {
    case "claim":
      return (
        <RoomRound
          state={state}
          currentUserId={currentUserId}
          lastRejection={actions.lastRejection}
          onClaim={actions.claim}
        />
      );
    // "guess_who" -> GuessWhoRoundBoard, wired in Task 12.
    // "turn_based_cut" -> TurnBasedCutBoard, wired in Task 18.
    // "voting" -> VotingBoard, wired in Task 21.
    // "shared_grid" -> SharedGridRankSubmission, wired in Task 23.
    // "relay" -> RelayInsertBoard, wired in Task 25.
    default:
      return null;
  }
}
```

- [ ] **Step 4: Write the failing test for `RoomBetweenBoard.tsx`, then implement it identically**

`src/features/friends-rooms/RoomBetweenBoard.test.tsx` mirrors Step 1's test exactly, importing `RoomBetweenBoard` and asserting a `mode: "claim"` state with a resolved round (`survivorItemId` set) renders the survivor heading text from the `room` catalog (`t("between.survivorHeading")`).

```tsx
"use client";

import type { RoomState } from "./room-types";
import { RoomBetween } from "./RoomBetween";

interface RoomBetweenBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
}

/** The `phase === 'between'` dispatcher — mirrors RoomRoundBoard exactly. */
export function RoomBetweenBoard({
  state,
  currentUserId,
  onNext,
}: RoomBetweenBoardProps) {
  switch (state.mode) {
    case "claim":
      return (
        <RoomBetween
          state={state}
          currentUserId={currentUserId}
          onNext={onNext}
        />
      );
    // Every other mode's between-round block is added by that mode's task
    // group (Tasks 13/19/22/24/26) — each reuses this same shell, since "show
    // this round's outcome + wait for everyone to press Next" is identical
    // lobby-side chrome across every mode; only the outcome BLOCK differs.
    default:
      return null;
  }
}
```

- [ ] **Step 5: Run both test files, confirm they pass**

Run: `npm test -- src/features/friends-rooms/RoomRoundBoard.test.tsx src/features/friends-rooms/RoomBetweenBoard.test.tsx`
Expected: PASS.

- [ ] **Step 6: Wire the dispatchers + the `guessing` phase into `RoomScreen.tsx`**

Replace the imports of `RoomRound`/`RoomBetween` with the two new dispatchers, add the `GuessingPhaseScreen` import (built in Task 15 — until then this branch is a no-op `null`, which is fine: `ROOMS_DORMANT` keeps the whole surface unreachable until Task 31), and add `setMode`/the new per-mode actions to the props `RoomScreen` reads off `useFriendsRoom`:

```tsx
import { RoomRoundBoard } from "./RoomRoundBoard";
import { RoomBetweenBoard } from "./RoomBetweenBoard";
```

```tsx
const {
  state,
  connection,
  lastRejection,
  lastModeRejection,
  kicked,
  claim,
  cut,
  pick,
  vote,
  submitRanking,
  placeItem,
  ready,
  next,
  lock,
  leave,
  kick,
  setMode,
  guess,
} = useFriendsRoom(roomId);
```

Replace the `state.phase === "round"` and `state.phase === "between"` blocks:

```tsx
{
  state.phase === "lobby" && (
    <RoomLobby
      state={state}
      currentUserId={userId}
      onReady={ready}
      onLock={lock}
      onKick={kick}
      onSetMode={setMode}
    />
  );
}
{
  state.phase === "round" && (
    <RoomRoundBoard
      state={state}
      currentUserId={userId}
      actions={{
        claim,
        cut,
        pick,
        vote,
        submitRanking,
        placeItem,
        lastRejection,
        lastModeRejection,
      }}
    />
  );
}
{
  state.phase === "between" && (
    <RoomBetweenBoard state={state} currentUserId={userId} onNext={next} />
  );
}
{
  state.phase === "guessing" && (
    <GuessingPhaseScreen state={state} onSubmit={guess} />
  );
}
```

Add the `GuessingPhaseScreen` import at the top; it does not exist until Task 16, so add a temporary placeholder export in this task to keep the build green, replaced for real in Task 16:

```tsx
import { GuessingPhaseScreen } from "./GuessingPhaseScreen";
```

Create a minimal `src/features/friends-rooms/GuessingPhaseScreen.tsx` stub now (Task 16 replaces its body, not its file, so no downstream import ever needs to change):

```tsx
"use client";

import type { RoomState } from "./room-types";

export function GuessingPhaseScreen({
  state: _state,
  onSubmit: _onSubmit,
}: {
  state: RoomState;
  onSubmit: (mapping: Record<string, string>) => void;
}) {
  // Replaced with the real assignment UI in Task 16.
  return null;
}
```

- [ ] **Step 7: Update `RoomScreen.test.tsx`'s render helper for the new required `useFriendsRoom` fields**

Every existing test that mocks `useFriendsRoom`'s return value needs the new fields (`cut`, `pick`, `vote`, `submitRanking`, `placeItem`, `setMode`, `guess`, `lastModeRejection`) added as `vi.fn()`/`null` so the mock satisfies the hook's real return type. No new assertions needed in this step — Task 6 doesn't add new RoomScreen behavior beyond routing, which the existing phase-switch tests (`renders RoomLobby when phase is lobby`, etc.) already cover once they compile again.

- [ ] **Step 8: Run the full `friends-rooms` test suite, confirm everything passes**

Run: `npm test -- src/features/friends-rooms`
Expected: PASS across every file in the directory.

- [ ] **Step 9: Typecheck**

Run: `npm run typecheck`
Expected: Errors remaining should now be limited to `RoomPresenceIndicator.tsx` (Task 7) and `FriendsRoomEntry`/`PackDetailScreen` wiring (Task 8) plus whatever Task 1's Step 5 list still shows outstanding.

- [ ] **Step 10: Commit**

```bash
git add src/features/friends-rooms/RoomScreen.tsx src/features/friends-rooms/RoomScreen.test.tsx src/features/friends-rooms/RoomRoundBoard.tsx src/features/friends-rooms/RoomRoundBoard.test.tsx src/features/friends-rooms/RoomBetweenBoard.tsx src/features/friends-rooms/RoomBetweenBoard.test.tsx src/features/friends-rooms/GuessingPhaseScreen.tsx src/features/friends-rooms/test-fixtures.ts
git commit -m "feat(rooms): route round/between per mode in RoomScreen, add the guessing phase"
```

### Task 7: Fix `RoomPresenceIndicator`'s empty-seat math for per-mode capacity

**Files:**

- Modify: `src/features/friends-rooms/RoomPresenceIndicator.tsx`
- Modify: `src/features/friends-rooms/RoomPresenceIndicator.test.tsx`

`MyRoomSummary` (confirmed against the backend type, mirrored in Task 1) carries `{ id, packTitle, status, players }` — **no capacity field**. The existing chip fills `MAX_PLAYERS - room.players.length` dashed empty-seat circles, which silently assumed every room seats exactly 4. A Guess-who room seats up to 8 and a Voting room up to 12; rendering "4 dashed circles" next to 6 real avatars in an 8-seat room is actively wrong, not just stale styling.

- [ ] **Step 1: Write the failing test**

Add to `RoomPresenceIndicator.test.tsx` (alongside its existing render tests):

```tsx
it("does not render empty-seat placeholders (capacity is not on MyRoomSummary)", () => {
  render(
    <RoomPresenceIndicator />,
    // existing test harness already mocks useAuth/useFriendsRoomsPresence —
    // extend its room fixture to 6 players, which would have gone NEGATIVE
    // under the old `MAX_PLAYERS - room.players.length` (4 - 6 = -2) math.
  );
  expect(screen.queryByText(/\+/)).not.toBeInTheDocument(); // no stray "+N" overflow chip either
  // six avatars rendered, zero dashed placeholders:
  expect(
    screen.getAllByRole("img", { hidden: true }).length,
  ).toBeLessThanOrEqual(6);
});
```

(Follow the existing test file's exact mocking pattern for `useAuth`/`useFriendsRoomsPresence`/`usePathname` — read it first — and extend its room fixture's `players` array to 6 entries for this test.)

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/RoomPresenceIndicator.test.tsx`
Expected: FAIL (or already-passing-for-the-wrong-reason if `Math.max(0, ...)` already floors it at 0 — in which case the real bug is only visible in a room with LESS than 4 real players, which still renders too many placeholders; assert the placeholder count precisely instead: for a 2-player, capacity-unknown room, expect **zero** dashed placeholders, where the old code rendered 2).

- [ ] **Step 3: Remove the empty-seat placeholder logic entirely**

In `RoomPresenceIndicator.tsx`'s `RoomChip`, delete the `emptySeats` computation and the `Array.from({ length: emptySeats })` block:

```tsx
function RoomChip({
  room,
  onClick,
}: {
  room: MyRoomSummary;
  onClick: () => void;
}) {
  const t = useTranslations("room");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("presence.returnTo", { title: room.packTitle })}
      className="group flex max-w-[19rem] items-center gap-3 rounded-2xl border border-acc/40 bg-surface py-2.5 pl-3 pr-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)] ring-1 ring-acc/10 transition-colors hover:border-acc focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
    >
      <div className="flex flex-none">
        <AvatarStack
          users={room.players.map((player) => ({
            username: player.username,
            avatarKey: player.avatarKey,
          }))}
          size="md"
          ringClassName="border-surface"
          max={6}
        />
      </div>
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className="flex max-w-full items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-acc">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acc/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-acc" />
          </span>
          {t("presence.playerCount", { count: room.players.length })}
        </span>
        <span className="w-full truncate text-[15px] font-semibold text-foreground">
          {room.packTitle}
        </span>
      </span>
    </button>
  );
}
```

`AvatarStack` already has its own `max`-driven `+N` overflow chip (confirmed by reading `src/shared/components/AvatarStack.tsx` — capped at 6 here, generous enough for a 4-seat Claim room to show everyone and a 12-seat Voting room to collapse the rest into a `+N`), so this is a strict simplification, not a feature loss — the chip now says "correct, always" instead of "correct only for the one capacity that used to be the only one that existed."

Update the `room.entry.presence.label` key usage: it referenced `{ count, max }`; replace with a new `presence.playerCount` key taking only `{ count }` (Task 28 later consolidates every OTHER new i18n key, but this one is deleted-and-replaced in place right here, in this same step, since leaving `presence.label` half-updated would break this task's own Step 4 test before Task 28 ever runs):

In `messages/en.json`, under `room.presence`, replace:

```json
    "label": "{count} / {max} in room"
```

with:

```json
    "playerCount": "{count} in room"
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/RoomPresenceIndicator.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/friends-rooms/RoomPresenceIndicator.tsx src/features/friends-rooms/RoomPresenceIndicator.test.tsx messages/en.json
git commit -m "fix(rooms): presence chip no longer assumes a fixed 4-seat capacity"
```

### Task 8: Re-mount `FriendsRoomEntry` into `PackDetailScreen.tsx`

**Files:**

- Modify: `src/features/pack/PackDetailScreen.tsx`
- Modify: `src/features/pack/PackDetailScreen.test.tsx`

Confirmed by direct grep in this session: `PackDetailScreen.tsx` imports and renders only `PackPlayButton` in its play panel — `FriendsRoomEntry` is not referenced anywhere in `src/features/pack/` or `app/packs/`. This task re-adds it, gated on `ROOMS_DORMANT` so it stays invisible until Task 31 flips the flag (mirrors `JoinRoomCard`'s own existing `if (ROOMS_DORMANT) return null;` guard pattern exactly).

- [ ] **Step 1: Write the failing test**

Add to `PackDetailScreen.test.tsx`:

```tsx
it("does not render the room entry while ROOMS_DORMANT is true", () => {
  render(<PackDetailScreen pack={makeTestPack()} />);
  expect(
    screen.queryByRole("button", { name: /create room/i }),
  ).not.toBeInTheDocument();
});
```

(This test is written to PASS immediately against dormant behavior — its purpose is to lock in "no room entry while dormant" as an explicit, checked contract, the same defensive-test role `RoomPresenceIndicator`'s existing dormant-hides tests already play. The real "it renders once revived" behavior is exercised by `FriendsRoomEntry.test.tsx` itself, unit-tested in isolation — flipping `ROOMS_DORMANT` process-wide just to test one render path here would require a module-level mock this file doesn't otherwise need.)

- [ ] **Step 2: Run the test, confirm it already passes (characterization, not red/green)**

Run: `npm test -- src/features/pack/PackDetailScreen.test.tsx`
Expected: PASS already, both before and after Step 3 — this is a safety-net test, not a red step, since `FriendsRoomEntry` is gated to render nothing regardless.

- [ ] **Step 3: Wire `FriendsRoomEntry` into the play panel**

In `PackDetailScreen.tsx`, add the import:

```tsx
import { FriendsRoomEntry } from "@/src/features/friends-rooms/FriendsRoomEntry";
```

Update the play panel:

```tsx
<Panel className="flex flex-col gap-3 rounded-[20px] p-5">
  <PackPlayButton packId={pack.id} />
  <PackPlayEstimate pack={pack} />
  {/* Room infra is dormant until every mode's UI ships (see
                  docs/superpowers/plans/2026-07-29-rooms-ui-plan.md, Task 31) —
                  FriendsRoomEntry itself no-ops nothing here since it has no
                  ROOMS_DORMANT guard of its own; it is simply not rendered
                  until that flip, mirroring how JoinRoomCard guards itself. */}
  {!ROOMS_DORMANT && <FriendsRoomEntry packId={pack.id} />}
</Panel>
```

Add the `ROOMS_DORMANT` import:

```tsx
import { ROOMS_DORMANT } from "@/src/features/friends-rooms/room-types";
```

- [ ] **Step 4: Run the test, confirm it still passes**

Run: `npm test -- src/features/pack/PackDetailScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/pack/PackDetailScreen.tsx src/features/pack/PackDetailScreen.test.tsx
git commit -m "feat(rooms): re-mount FriendsRoomEntry on the pack detail page, still gated dormant"
```

---

## Group B — Claim mode (generalize the existing board from save_one_friends-only to save_one + sacrifice_one)

Per the design brief §4.3(a): "mostly unchanged... Only change: it's now a _mode_, reachable from save_one/sacrifice_one packs (labels flip for sacrifice)." `RoomRound`/`RoomItemCard`/`RoomBetween` keep their exact shapes; only their hardcoded "sacrifice" copy becomes format-aware, and the claim-rejection UI learns to distinguish `too_fast` from `taken`.

### Task 9: Format-aware claim copy (save vs sacrifice) in `RoomItemCard`/`RoomRound`/`RoomBetween`/`RoomResults`

**Files:**

- Modify: `src/features/friends-rooms/RoomItemCard.tsx`
- Modify: `src/features/friends-rooms/RoomItemCard.test.tsx`
- Modify: `src/features/friends-rooms/RoomRound.tsx`
- Modify: `src/features/friends-rooms/RoomRound.test.tsx`
- Modify: `src/features/friends-rooms/RoomBetween.tsx`
- Modify: `src/features/friends-rooms/RoomResults.tsx`

Today's copy is hardcoded around "sacrifice" (`round.claim: "Sacrifice {name}"`, `round.instruction: "Claim one item to sacrifice..."`) because the old format WAS always the sacrifice framing. Now Claim also serves `save_one` packs, where the same mechanic reads as "claim one to SAVE, the rest are eliminated" — inverted framing, same mechanic. Every claim-board component needs the pack's format threaded through to pick the right verb via `claimVerbKey` (Task 4).

- [ ] **Step 1: Write the failing test**

Add to `RoomItemCard.test.tsx`:

```tsx
it("uses the save verb for a save_one room and the sacrifice verb for sacrifice_one", () => {
  const item = {
    id: "i1",
    title: "Pizza",
    type: "text" as const,
    value: "Pizza",
  };
  const { rerender } = render(
    <RoomItemCard
      item={item}
      index={0}
      status="free"
      format="save_one"
      onClaim={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("button", { name: /save pizza/i }),
  ).toBeInTheDocument();

  rerender(
    <RoomItemCard
      item={item}
      index={0}
      status="free"
      format="sacrifice_one"
      onClaim={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("button", { name: /sacrifice pizza/i }),
  ).toBeInTheDocument();
});

it("the survivor badge also flips: 'Saved' for save_one, 'Survivor' for sacrifice_one", () => {
  const item = {
    id: "i1",
    title: "Pizza",
    type: "text" as const,
    value: "Pizza",
  };
  render(
    <RoomItemCard item={item} index={0} status="survivor" format="save_one" />,
  );
  expect(screen.getByText(/saved/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/RoomItemCard.test.tsx`
Expected: FAIL — `format` prop doesn't exist yet, copy is hardcoded to the old strings.

- [ ] **Step 3: Add `messages/en.json` keys**

Under the `room` namespace's `round` object, replace the single hardcoded `claim`/`instruction`/`survivor`/`sacrificedBy` keys with format-keyed pairs:

```json
  "round": {
    "heading": "Round {index} of {total}",
    "instructionSave": "Claim one item to save. Everyone else is eliminated.",
    "instructionSacrifice": "Claim one item to sacrifice. The item nobody claims survives.",
    "claimSave": "Save {name}",
    "claimSacrifice": "Sacrifice {name}",
    "taken": "Taken",
    "claimedBySave": "Kept by {name}",
    "claimedBySacrifice": "Sacrificed by {name}",
    "survivorSave": "Saved",
    "survivorSacrifice": "Survivor",
    "chosen": "{count} of {total} have chosen"
  },
```

Update `between.survivorHeading`/`between.survivorNote`/`between.boardHeading` and `results.*` the same way (`survivorHeadingSave`/`survivorHeadingSacrifice`, etc.) — mirror the pattern exactly; every key that says "survivor"/"sacrifice" in its English copy today gets a `Save`/`Sacrifice` pair.

- [ ] **Step 4: Thread `format: Pack["format"]` through `RoomItemCard`**

```tsx
import { claimVerbKey } from "./room-mode-copy";
import type { Pack } from "@/src/shared/types/pack";

interface RoomItemCardProps {
  item: Item;
  index: number;
  status: RoomItemStatus;
  claimant?: RoomPlayerState | null;
  isOwn?: boolean;
  flash?: boolean;
  onClaim?: () => void;
  /** save_one or sacrifice_one — picks the "Save"/"Sacrifice" verb pair. */
  format: Extract<Pack["format"], "save_one" | "sacrifice_one">;
}
```

Replace the `statusLabel`/`claimLabel` derivations to key off `claimVerbKey(format)` producing `"Save"`/`"Sacrifice"`, e.g.:

```tsx
const verb = claimVerbKey(format).endsWith("Save") ? "Save" : "Sacrifice";
const statusLabel =
  status === "survivor"
    ? t(`round.survivor${verb}`)
    : status === "free"
      ? null
      : claimant
        ? t(`round.claimedBy${verb}`, { name: claimant.username })
        : t("round.taken");
const claimLabel = t(`round.claim${verb}`, { name: item.title });
```

(Replace every other `t("round.claim", ...)`/`t("round.survivor")`/etc. call site in the file with the same `${verb}`-suffixed key.)

- [ ] **Step 5: Thread `format` through `RoomRound`/`RoomBetween`/`RoomResults`**

Each of these already receives `state: RoomState`, which carries `packId` but not the pack's `format` — Claim's own round data has no format field either (it is Claim-specific context, not part of the universal `RoundState`). Add a `format` prop to all three, sourced from `RoomScreen` (which already has the full `Pack` nowhere — confirm: `RoomScreen` only ever fetches `roomId`, no pack. The format must come from the server). Backend `RoomState` does not carry the pack's format directly, but Claim only ever offers two formats and doesn't need to distinguish "which one" for feasibility — only for THIS COPY. Resolve by exposing it through `state.round?.name` fallback? No — do not guess: add a new field the board reads from the **pack fetch already available** —

Since `RoomScreen` has no pack fetch today (by design — "No server-side pack fetch — nothing to render before the socket connects", per its own route file comment), the cleanest fix is a tiny REST addition: `friendsRoomsClient.getById` already returns `RoomState`; the simplest correct source of truth is to widen `RoomState.packFormat: PackFormat` in Task 1's contract. **Amend Task 1 now**: add `packFormat: PackFormat` to the `RoomState` interface in `room-types.ts` (this is a real backend field — confirmed present as `packFormat` is NOT in the backend's `RoomState` today; flag this as a backend follow-up, not something this frontend-only plan can invent unilaterally).

**Resolution actually used in this task** (do not wait on a backend change): `RoomScreen` already threads `state.packTitle`; Claim's format-aware copy only needs a boolean ("is this a sacrifice-framed room"), and that boolean is recoverable from data already on the wire — **the round's own item semantics carry no format signal, so the honest fix is: `RoomRound`/`RoomBetween`/`RoomResults` accept an optional `packFormat?: Extract<Pack["format"], "save_one" | "sacrifice_one">` prop, defaulting to `"sacrifice_one"` when absent** (preserves today's exact copy for any room whose format truly isn't known yet), and `RoomScreen` is extended to fetch the pack once via the existing `packsClient.getById(state.packId)` (already used elsewhere in this codebase, e.g. `get-pack-server.ts`'s client-side sibling) on mount, caching it in local state:

```tsx
// RoomScreen.tsx — add alongside the existing useFriendsRoom() call:
const [packFormat, setPackFormat] = useState<
  Extract<Pack["format"], "save_one" | "sacrifice_one"> | undefined
>(undefined);
useEffect(() => {
  if (!state?.packId) return;
  packsClient
    .getById(state.packId)
    .then((pack) => {
      if (pack.format === "save_one" || pack.format === "sacrifice_one") {
        setPackFormat(pack.format);
      }
    })
    .catch(() => undefined); // best-effort — the copy fallback covers a failed fetch
}, [state?.packId]);
```

Thread `packFormat={packFormat ?? "sacrifice_one"}` into `<RoomRoundBoard>` (add it to `RoomRoundActions` or as a sibling prop — add as a sibling prop on `RoomRoundBoard`/`RoomBetweenBoard` directly, since it's request-derived data, not an action) and down into `RoomRound`/`RoomBetween`/`RoomResults`.

- [ ] **Step 6: Run the tests, confirm they pass**

Run: `npm test -- src/features/friends-rooms`
Expected: PASS.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: Only Groups C–H's not-yet-built modes should remain as gaps (none — `RoomRoundBoard`'s `default: return null` covers every not-yet-built mode without a type error).

- [ ] **Step 8: Commit**

```bash
git add src/features/friends-rooms/RoomItemCard.tsx src/features/friends-rooms/RoomItemCard.test.tsx src/features/friends-rooms/RoomRound.tsx src/features/friends-rooms/RoomRound.test.tsx src/features/friends-rooms/RoomBetween.tsx src/features/friends-rooms/RoomResults.tsx src/features/friends-rooms/RoomScreen.tsx messages/en.json
git commit -m "feat(rooms): make Claim's save/sacrifice copy format-aware instead of sacrifice-only"
```

### Task 10: Distinguish `too_fast` from `taken` in the claim-rejection flash

**Files:**

- Modify: `src/features/friends-rooms/RoomRound.tsx`
- Modify: `src/features/friends-rooms/RoomRound.test.tsx`

Today `RoomRound` flashes the contested card red for ANY rejection (`lastRejection?.itemId === item.id`), with no distinction between "someone beat you to it" (`taken`) and "you're re-claiming too fast" (`too_fast` — the anti-script throttle on CHANGING an existing claim, `CLAIM_CHANGE_INTERVAL_MS = 1000ms` server-side). The task explicitly calls for "anti-script throttle feedback" as its own requirement — a same-color flash reads as "you lost the item" in both cases, which is actively misleading for the throttle case (the item may still be free; you just have to wait a moment before re-claiming).

- [ ] **Step 1: Write the failing test**

```tsx
it("shows a distinct 'slow down' note for a too_fast rejection, not the generic taken flash", () => {
  render(
    <RoomRound
      state={roundState}
      currentUserId="u1"
      lastRejection={{ itemId: "i1", reason: "too_fast", claims: {} }}
      onClaim={vi.fn()}
    />,
  );
  expect(screen.getByText(/wait a moment/i)).toBeInTheDocument();
});

it("shows no 'slow down' note for a plain taken rejection", () => {
  render(
    <RoomRound
      state={roundState}
      currentUserId="u1"
      lastRejection={{ itemId: "i1", reason: "taken", claims: {} }}
      onClaim={vi.fn()}
    />,
  );
  expect(screen.queryByText(/wait a moment/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/RoomRound.test.tsx`
Expected: FAIL — no such note exists.

- [ ] **Step 3: Implement**

Add below the existing grid, before the "chosen" counter `<Text>`:

```tsx
{
  lastRejection?.reason === "too_fast" && (
    <Text role="status" variant="secondary" className="text-xs text-score">
      {t("round.tooFastNote")}
    </Text>
  );
}
```

Add `messages/en.json`'s `room.round.tooFastNote`: `"You're re-claiming too fast — wait a moment and try again."`

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/RoomRound.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/friends-rooms/RoomRound.tsx src/features/friends-rooms/RoomRound.test.tsx messages/en.json
git commit -m "feat(rooms): surface the too_fast anti-script throttle distinctly from a lost claim"
```

---

## Group C — Guess Who mode (the marquee social mode: blind picks, anonymous labels, endgame, leaderboard)

The richest new surface (design brief §4.3(d)). Built in five layers: a shared "who's locked in" indicator (reused by Shared-grid in Group F), the blind round board, the between-round label-accumulation reveal, the interactive guessing endgame, and the identity reveal + leaderboard (the app's first scored/winner screen — also reused as-is by any future scored mode, per the brief's §6 "worth designing a small reusable system").

### Task 11: `LockedInRoster.tsx` — shared "who's locked in" indicator (blind modes)

**Files:**

- Create: `src/features/friends-rooms/LockedInRoster.tsx`
- Create: `src/features/friends-rooms/LockedInRoster.test.tsx`

Used by Guess-who (this task) and Shared-grid (Task 24) — both blind modes whose `RoundState.lockedIn: string[]` carries only _who_ has submitted, never _what_. A shared component keeps the "never render the actual pick" discipline in exactly one place.

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { LockedInRoster } from "./LockedInRoster";

const PLAYERS = [
  {
    userId: "u1",
    username: "Alice",
    avatarKey: null,
    seat: 0,
    connected: true,
    ready: true,
    next: false,
    claimedItemId: null,
  },
  {
    userId: "u2",
    username: "Bob",
    avatarKey: null,
    seat: 1,
    connected: true,
    ready: true,
    next: false,
    claimedItemId: null,
  },
];

describe("LockedInRoster", () => {
  it("shows a checkmark for a locked-in player and a pending dot for the rest", () => {
    render(<LockedInRoster players={PLAYERS} lockedIn={["u1"]} />);
    expect(screen.getByLabelText(/alice.*locked in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bob.*waiting/i)).toBeInTheDocument();
  });

  it("never renders anything about WHAT a player picked", () => {
    render(<LockedInRoster players={PLAYERS} lockedIn={["u1", "u2"]} />);
    // Only names + status, never an item title, ever appear in this component's
    // own props — this test is a structural guard: LockedInRosterProps has no
    // field that could carry a selection, so there is nothing to assert a leak
    // against beyond confirming the component renders from lockedIn alone.
    expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/LockedInRoster.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import type { RoomPlayerState } from "./room-types";

interface LockedInRosterProps {
  players: RoomPlayerState[];
  /** userIds who have submitted a BLIND selection/ranking this round — never
   * what they submitted. */
  lockedIn: string[];
}

/**
 * "Who's locked in" for a blind round (Guess-who, Shared-grid) — every seated
 * player as a small avatar chip, checked once they've locked in, dimmed while
 * still deciding. Deliberately carries no prop that could leak a selection:
 * this component physically cannot render a pick, only who has made one.
 */
export function LockedInRoster({ players, lockedIn }: LockedInRosterProps) {
  const t = useTranslations("room");
  const lockedSet = new Set(lockedIn);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {players.map((player) => {
          const locked = lockedSet.has(player.userId);
          return (
            <div
              key={player.userId}
              aria-label={
                locked
                  ? t("lockedIn.playerLocked", { name: player.username })
                  : t("lockedIn.playerWaiting", { name: player.username })
              }
              className={cn(
                "flex items-center gap-1.5 rounded-pill border px-2 py-1",
                locked
                  ? "border-live/40 bg-live/10"
                  : "border-border bg-white/[0.02] opacity-70",
              )}
            >
              <UserAvatar
                username={player.username}
                avatarKey={player.avatarKey}
                size="xs"
              />
              <Text className="text-[11px] font-medium">{player.username}</Text>
              {locked && <Check size={12} aria-hidden className="text-live" />}
            </div>
          );
        })}
      </div>
      <Text variant="secondary" aria-live="polite" className="text-xs">
        {t("lockedIn.count", { count: lockedIn.length, total: players.length })}
      </Text>
    </div>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/LockedInRoster.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/friends-rooms/LockedInRoster.tsx src/features/friends-rooms/LockedInRoster.test.tsx
git commit -m "feat(rooms): add LockedInRoster, the shared blind-round lock-in indicator"
```

### Task 12: `GuessWhoRoundBoard.tsx` — blind pick (single-select) or blind rank UI

**Files:**

- Create: `src/features/friends-rooms/GuessWhoRoundBoard.tsx`
- Create: `src/features/friends-rooms/GuessWhoRoundBoard.test.tsx`
- Modify: `src/features/friends-rooms/RoomRoundBoard.tsx`
- Modify: `src/features/friends-rooms/RoomRoundBoard.test.tsx`

`RoundState.actionKind` is `"pick"` (save_one/sacrifice_one/1v1/nxn — select one of `optionIds`) or `"rank"` (rank_blind — submit a full ordering). Reuses the SOLO play interaction vocabulary directly: the pick path mirrors `CandidateCard`'s select-one-of-many card grid; the rank path mirrors `RankPlayScreen`'s click-to-place-next-item flow. The one thing neither solo screen has: once you lock in, the board must show YOUR OWN choice highlighted but nobody else's (`LockedInRoster`, Task 11) — solo play has no "everybody else" to hide.

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GuessWhoRoundBoard } from "./GuessWhoRoundBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("GuessWhoRoundBoard", () => {
  it("pick mode: clicking an option locks it in and calls onPick once", async () => {
    const onPick = vi.fn();
    render(
      <GuessWhoRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            actionKind: "pick",
            lockedIn: [],
          },
        })}
        currentUserId="u1"
        onPick={onPick}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /pizza/i }));
    expect(onPick).toHaveBeenCalledWith(["i1"]);
  });

  it("pick mode: once locked in, the board shows YOUR pick highlighted and stops taking further clicks", async () => {
    const onPick = vi.fn();
    render(
      <GuessWhoRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            actionKind: "pick",
            lockedIn: ["u1"],
          },
        })}
        currentUserId="u1"
        myLastSelection={["i1"]}
        onPick={onPick}
      />,
    );
    expect(screen.getByRole("button", { name: /pizza/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("rank mode: clicking items one at a time builds a full ranking and submits when the last item is placed", async () => {
    const onPick = vi.fn();
    render(
      <GuessWhoRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            actionKind: "rank",
            lockedIn: [],
          },
        })}
        currentUserId="u1"
        onPick={onPick}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /pizza/i }));
    await userEvent.click(screen.getByRole("button", { name: /sushi/i }));
    expect(onPick).toHaveBeenLastCalledWith(["i1", "i2"]);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/GuessWhoRoundBoard.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { LockedInRoster } from "./LockedInRoster";
import type { RoomState } from "./room-types";

interface GuessWhoRoundBoardProps {
  state: RoomState;
  currentUserId: string | null;
  /** This player's own submitted selection this round, once locked in — the
   * ONLY selection this component is ever allowed to render (the server never
   * sends anyone else's). Undefined/null while still deciding. */
  myLastSelection?: string[] | null;
  onPick: (selection: string[]) => void;
}

/**
 * The Guess-who round board (design brief §4.3(d)): a blind pick (one option)
 * or a blind full ranking (click items into order), depending on
 * `round.actionKind`. Reuses the click-to-select vocabulary from the SOLO play
 * screens (CandidateCard's card grid for `pick`; RankPlayScreen's
 * click-to-place-next for `rank`) — the only genuinely NEW piece here is that
 * a locked-in choice shows only to the player who made it (LockedInRoster
 * shows everyone else only as "locked in", never what they chose).
 */
export function GuessWhoRoundBoard({
  state,
  currentUserId,
  myLastSelection,
  onPick,
}: GuessWhoRoundBoardProps) {
  const t = useTranslations("room");
  const round = state.round;
  const [rankSoFar, setRankSoFar] = useState<string[]>([]);
  if (!round || !round.optionIds || !round.actionKind) return null;

  const me = state.players.find((p) => p.userId === currentUserId);
  const iAmLockedIn = Boolean(me && round.lockedIn?.includes(me.userId));
  const itemsById = new Map(round.items.map((item) => [item.id, item]));

  function selectPick(optionId: string) {
    if (iAmLockedIn || round?.actionKind !== "pick") return;
    onPick([optionId]);
  }

  function selectRankNext(optionId: string) {
    if (
      iAmLockedIn ||
      round?.actionKind !== "rank" ||
      rankSoFar.includes(optionId)
    ) {
      return;
    }
    const next = [...rankSoFar, optionId];
    setRankSoFar(next);
    if (next.length === round.optionIds!.length) onPick(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("round.heading", {
            index: round.index + 1,
            total: state.totalRounds,
          })}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {round.name || t("guessWho.roundInstruction")}
        </Text>
        <Text variant="secondary" className="text-sm">
          {round.actionKind === "pick"
            ? t("guessWho.pickInstruction")
            : t("guessWho.rankInstruction")}
        </Text>
      </header>

      {round.actionKind === "pick" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {round.optionIds.map((optionId) => {
            const item = itemsById.get(optionId);
            const isMine = myLastSelection?.[0] === optionId;
            return (
              <button
                key={optionId}
                type="button"
                aria-pressed={isMine}
                disabled={iAmLockedIn}
                onClick={() => selectPick(optionId)}
                className={cn(
                  "rounded-card border-[1.5px] bg-surface p-4 text-start transition-colors",
                  isMine
                    ? "border-acc ring-[3px] ring-acc/30"
                    : "border-border hover:border-border-strong",
                  iAmLockedIn && !isMine && "opacity-50",
                )}
              >
                <Text className="font-semibold">{item?.title ?? optionId}</Text>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {round.optionIds.map((optionId) => {
            const item = itemsById.get(optionId);
            const placedAt = rankSoFar.indexOf(optionId);
            const placed = placedAt !== -1;
            return (
              <button
                key={optionId}
                type="button"
                disabled={iAmLockedIn || placed}
                onClick={() => selectRankNext(optionId)}
                className={cn(
                  "flex items-center gap-3 rounded-tile border-[1.5px] p-[14px] text-start transition-colors",
                  placed
                    ? "border-border opacity-60"
                    : "border-dashed border-white/[0.14] hover:border-acc/40",
                )}
              >
                <span
                  aria-hidden
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-chip bg-white/[0.06] text-[12px] font-semibold"
                >
                  {placed ? placedAt + 1 : ""}
                </span>
                <Text className="flex-1 text-sm font-semibold">
                  {item?.title ?? optionId}
                </Text>
              </button>
            );
          })}
        </div>
      )}

      <LockedInRoster players={state.players} lockedIn={round.lockedIn ?? []} />
    </div>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/GuessWhoRoundBoard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire it into `RoomRoundBoard.tsx`**

```tsx
    case "guess_who":
      return (
        <GuessWhoRoundBoard
          state={state}
          currentUserId={currentUserId}
          onPick={actions.pick}
        />
      );
```

Add the import; add a matching case in `RoomRoundBoard.test.tsx` asserting a `mode: "guess_who"` state renders the pick grid.

- [ ] **Step 6: Run the full suite, confirm green; commit**

Run: `npm test -- src/features/friends-rooms`
Expected: PASS.

```bash
git add src/features/friends-rooms/GuessWhoRoundBoard.tsx src/features/friends-rooms/GuessWhoRoundBoard.test.tsx src/features/friends-rooms/RoomRoundBoard.tsx src/features/friends-rooms/RoomRoundBoard.test.tsx
git commit -m "feat(rooms): add the Guess-who blind pick/rank round board"
```

### Task 13: `GuessWhoRevealBoard.tsx` — between-round reveal + accumulating label-history table

**Files:**

- Create: `src/features/friends-rooms/GuessWhoRevealBoard.tsx`
- Create: `src/features/friends-rooms/GuessWhoRevealBoard.test.tsx`
- Modify: `src/features/friends-rooms/RoomBetweenBoard.tsx`
- Modify: `src/features/friends-rooms/RoomBetweenBoard.test.tsx`

Design brief §3.5/§4.3(d): "each anonymous label's choice for that round is revealed... over the game, each label accumulates a 'build'... a history table — rows = rounds, columns = the anonymous labels." `state.results` (filtered to `kind: "reveal"` entries) already carries every past round's `picks: Record<label, string[]>` — this board renders them as a table, plus this round's fresh reveal at the top.

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GuessWhoRevealBoard } from "./GuessWhoRevealBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("GuessWhoRevealBoard", () => {
  it("shows this round's fresh reveal — every label's pick, resolved to the item title", () => {
    render(
      <GuessWhoRevealBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 1,
            name: "Round 2",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "reveal",
              index: 0,
              name: "Round 1",
              items: [ITEM("i3", "Tacos")],
              picks: { P1: ["i3"], P2: ["i3"] },
            },
            {
              kind: "reveal",
              index: 1,
              name: "Round 2",
              items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
              picks: { P1: ["i1"], P2: ["i2"] },
            },
          ],
        })}
        onNext={() => {}}
      />,
    );
    // The history table renders both rounds, with each label's choice resolved
    // to a title, never a raw item id.
    expect(screen.getAllByText("Pizza").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tacos").length).toBeGreaterThan(0);
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("P2")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/GuessWhoRevealBoard.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import type { RevealRoundResult, RoomState } from "./room-types";

interface GuessWhoRevealBoardProps {
  state: RoomState;
  onNext: () => void;
}

/**
 * Guess-who's between-round beat (design brief §4.3(d)/§3.5): a chronology
 * table — rows are rounds, columns are the stable anonymous labels — so the
 * whole game's trajectory is reviewable at a glance. Every cell resolves the
 * label's raw item id back to its title via that round's own `items`, since
 * `picks` only ever carries ids.
 */
export function GuessWhoRevealBoard({
  state,
  onNext,
}: GuessWhoRevealBoardProps) {
  const t = useTranslations("room");
  const reveals = state.results.filter(
    (r): r is RevealRoundResult => r.kind === "reveal",
  );
  const labels = Array.from(
    new Set(reveals.flatMap((r) => Object.keys(r.picks))),
  ).sort();

  const me = state.players.find((p) => p.userId === null);
  const ready = state.players.filter((p) => p.next).length;
  const total = state.players.length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("guessWho.revealHeading")}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {t("guessWho.trajectoryHeading")}
        </Text>
      </header>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="p-3 text-start font-semibold text-foreground-secondary">
                {t("guessWho.roundColumn")}
              </th>
              {labels.map((label) => (
                <th
                  key={label}
                  className="p-3 text-start font-semibold text-foreground-secondary"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reveals.map((round) => {
              const itemsById = new Map(
                round.items.map((item) => [item.id, item]),
              );
              return (
                <tr
                  key={round.index}
                  className="border-b border-border last:border-0"
                >
                  <td className="p-3 font-medium text-foreground-tertiary">
                    {round.name ||
                      t("results.roundLabel", { index: round.index + 1 })}
                  </td>
                  {labels.map((label) => {
                    const ids = round.picks[label] ?? [];
                    const titles = ids
                      .map((id) => itemsById.get(id)?.title ?? id)
                      .join(", ");
                    return (
                      <td key={label} className="p-3">
                        {titles || "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="secondary" aria-live="polite" className="text-sm">
          {t("between.ready", { count: ready, total })}
        </Text>
        <Button disabled={Boolean(me?.next)} onClick={onNext}>
          {t("between.next")}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/GuessWhoRevealBoard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire into `RoomBetweenBoard.tsx`**

```tsx
    case "guess_who":
      return <GuessWhoRevealBoard state={state} onNext={onNext} />;
```

- [ ] **Step 6: Run the full suite, confirm green; commit**

```bash
git add src/features/friends-rooms/GuessWhoRevealBoard.tsx src/features/friends-rooms/GuessWhoRevealBoard.test.tsx src/features/friends-rooms/RoomBetweenBoard.tsx src/features/friends-rooms/RoomBetweenBoard.test.tsx
git commit -m "feat(rooms): add the Guess-who between-round label-history reveal"
```

### Task 14: `RoomLeaderboard.tsx` — shared scored/winner podium (the app's first)

**Files:**

- Create: `src/features/friends-rooms/RoomLeaderboard.tsx`
- Create: `src/features/friends-rooms/RoomLeaderboard.test.tsx`

Design brief §3.6/§4.4: "brand new to the app... needs its own visual language." Built as a standalone, mode-agnostic component (`players: {userId, username, avatarKey, score}[]`) precisely so a future scored mode can reuse it without touching Guess-who's own code — per §6's "worth designing a small reusable system, since more scored modes may follow." Uses the podium tokens already reserved and unused in `design-tokens.md` (`--medal-gold`/`--medal-silver`/`--medal-bronze`).

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomLeaderboard } from "./RoomLeaderboard";

const ENTRIES = [
  { userId: "u2", username: "Bob", avatarKey: null, score: 3 },
  { userId: "u1", username: "Alice", avatarKey: null, score: 5 },
  { userId: "u3", username: "Cy", avatarKey: null, score: 1 },
];

describe("RoomLeaderboard", () => {
  it("sorts by score descending and marks the top scorer as the winner", () => {
    render(<RoomLeaderboard entries={ENTRIES} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Alice");
    expect(rows[0]).toHaveTextContent("5");
    expect(screen.getByText(/winner/i)).toBeInTheDocument();
  });

  it("a genuine tie for first shows every tied player as a winner", () => {
    render(
      <RoomLeaderboard
        entries={[
          { userId: "u1", username: "Alice", avatarKey: null, score: 4 },
          { userId: "u2", username: "Bob", avatarKey: null, score: 4 },
        ]}
      />,
    );
    expect(screen.getAllByText(/winner/i)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/RoomLeaderboard.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarKey: string | null;
  score: number;
}

const RANK_TONE = [
  "border-[var(--medal-gold)]/50 bg-[var(--medal-gold)]/10",
  "border-[var(--medal-silver)]/50 bg-[var(--medal-silver)]/10",
  "border-[var(--medal-bronze)]/50 bg-[var(--medal-bronze)]/10",
];

/**
 * A generic, mode-agnostic scored leaderboard + winner callout — the app's
 * first (design brief §3.6/§4.4). Deliberately takes only `{userId, username,
 * avatarKey, score}[]`, no mode-specific fields, so a future scored mode can
 * reuse it unmodified. Ties at first place are ALL marked winner — Guess-who's
 * own scoring never awards partial credit, so an exact-score tie is a genuine
 * shared win, not a display rounding artifact.
 */
export function RoomLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const t = useTranslations("room");
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score;

  return (
    <ol className="flex flex-col gap-2">
      {sorted.map((entry, index) => {
        const isWinner = entry.score === topScore;
        return (
          <li
            key={entry.userId}
            className={cn(
              "flex items-center gap-3 rounded-tile border p-3",
              index < 3 ? RANK_TONE[index] : "border-border bg-surface-card",
            )}
          >
            <span className="w-6 flex-none text-center text-sm font-bold tabular-nums text-foreground-tertiary">
              {index + 1}
            </span>
            <UserAvatar
              username={entry.username}
              avatarKey={entry.avatarKey}
              size="sm"
            />
            <Text className="flex-1 truncate text-sm font-semibold">
              {entry.username}
            </Text>
            {isWinner && (
              <span className="flex items-center gap-1 text-xs font-semibold text-score">
                <Crown size={14} aria-hidden />
                {t("leaderboard.winner")}
              </span>
            )}
            <Text
              variant="secondary"
              className="text-sm font-bold tabular-nums"
            >
              {t("leaderboard.points", { count: entry.score })}
            </Text>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/RoomLeaderboard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/friends-rooms/RoomLeaderboard.tsx src/features/friends-rooms/RoomLeaderboard.test.tsx
git commit -m "feat(rooms): add RoomLeaderboard, the shared scored/winner podium"
```

### Task 15: `GuessingPhaseScreen.tsx` — the identity-assignment endgame

**Files:**

- Modify: `src/features/friends-rooms/GuessingPhaseScreen.tsx` (replace the Task 6 stub)
- Create: `src/features/friends-rooms/GuessingPhaseScreen.test.tsx`

Design brief §4.3(d)/#2: "an assignment UI: drag/assign each real participant to a label (a bijection — each label to a distinct person)." Per D2's no-drag-anywhere convention (reaffirmed here, not just Relay's), this is built as **N labels, each a `<select>` of the candidate players**, enforcing the bijection client-side (a player picked for one label is removed from every other label's remaining options) before enabling Submit — simpler and more accessible than drag for an 8-entry-max mapping, and consistent with the rest of this codebase's form patterns (native `<select>`, no custom DnD primitive exists anywhere in this repo).

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GuessingPhaseScreen } from "./GuessingPhaseScreen";
import { baseRoomState } from "./test-fixtures";

describe("GuessingPhaseScreen", () => {
  it("renders one assignment control per label, and Submit is disabled until every label has a distinct player", async () => {
    const onSubmit = vi.fn();
    render(
      <GuessingPhaseScreen
        state={baseRoomState({
          phase: "guessing",
          mode: "guess_who",
          guessing: {
            labels: ["P1", "P2"],
            candidateUserIds: ["u1", "u2"],
            submitted: [],
          },
        })}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText("P1"), "u1");
    await userEvent.selectOptions(screen.getByLabelText("P2"), "u2");
    expect(screen.getByRole("button", { name: /submit/i })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledWith({ P1: "u1", P2: "u2" });
  });

  it("assigning the same player to two labels is impossible — picking them for P2 removes them from P1's options", async () => {
    render(
      <GuessingPhaseScreen
        state={baseRoomState({
          phase: "guessing",
          mode: "guess_who",
          guessing: {
            labels: ["P1", "P2"],
            candidateUserIds: ["u1", "u2"],
            submitted: [],
          },
        })}
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText("P1"), "u1");
    await userEvent.selectOptions(screen.getByLabelText("P2"), "u1");
    // P1's own selection must have been cleared by the swap — its value can no
    // longer be u1 once u1 moved to P2.
    expect(screen.getByLabelText<HTMLSelectElement>("P1").value).not.toBe("u1");
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/GuessingPhaseScreen.test.tsx`
Expected: FAIL — the stub from Task 6 renders `null`.

- [ ] **Step 3: Implement (replace the Task 6 stub in full)**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Username } from "@/src/shared/components/Username";
import type { RoomState } from "./room-types";

interface GuessingPhaseScreenProps {
  state: RoomState;
  onSubmit: (mapping: Record<string, string>) => void;
}

/**
 * The Guess-who endgame (design brief §4.3(d)/#2): assign each real player to
 * an anonymous label, submit once every label has a distinct assignment. A
 * native `<select>` per label, not drag-and-drop (see this plan's D2) — the
 * bijection is enforced here by clearing any OTHER label that already held the
 * player just picked, so two labels can never end up pointing at the same
 * person client-side (the server re-validates regardless, per
 * GUESS_REJECTION_REASONS.malformed).
 */
export function GuessingPhaseScreen({
  state,
  onSubmit,
}: GuessingPhaseScreenProps) {
  const t = useTranslations("room");
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const guessing = state.guessing;
  const usernameByUserId = useMemo(
    () => new Map(state.players.map((p) => [p.userId, p.username])),
    [state.players],
  );

  if (!guessing) return null;

  const alreadySubmitted = state.myGuess !== null;
  const complete = guessing.labels.every((label) => assignment[label]);

  function assign(label: string, userId: string) {
    if (!userId) {
      setAssignment((prev) => {
        const next = { ...prev };
        delete next[label];
        return next;
      });
      return;
    }
    setAssignment((prev) => {
      const next: Record<string, string> = {};
      for (const [existingLabel, existingUserId] of Object.entries(prev)) {
        if (existingUserId !== userId) next[existingLabel] = existingUserId;
      }
      next[label] = userId;
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("guessing.heading")}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {t("guessing.title")}
        </Text>
        <Text variant="secondary" className="text-sm">
          {t("guessing.instruction")}
        </Text>
      </header>

      {alreadySubmitted ? (
        <Text variant="secondary" className="text-sm">
          {t("guessing.waitingForOthers", {
            count: guessing.submitted.length,
            total: state.players.length,
          })}
        </Text>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {guessing.labels.map((label) => {
              const takenElsewhere = new Set(
                Object.entries(assignment)
                  .filter(([l]) => l !== label)
                  .map(([, u]) => u),
              );
              return (
                <label key={label} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-chip border border-acc/30 bg-acc/[0.12] font-mono text-sm font-bold text-acc">
                    {label}
                  </span>
                  <Text className="sr-only">{label}</Text>
                  <select
                    aria-label={label}
                    value={assignment[label] ?? ""}
                    onChange={(event) => assign(label, event.target.value)}
                    className="h-11 flex-1 rounded-control border border-border bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-acc"
                  >
                    <option value="">{t("guessing.chooseSomeone")}</option>
                    {guessing.candidateUserIds
                      .filter((userId) => !takenElsewhere.has(userId))
                      .map((userId) => (
                        <option key={userId} value={userId}>
                          {usernameByUserId.get(userId) ?? userId}
                        </option>
                      ))}
                  </select>
                </label>
              );
            })}
          </div>

          <Button
            disabled={!complete}
            onClick={() => onSubmit(assignment)}
            className="self-end"
          >
            {t("guessing.submit")}
          </Button>
        </>
      )}
    </div>
  );
}
```

(`Username` import above is unused in this implementation — remove it; the `usernameByUserId` map already resolves display names inline. Left out of the final file.)

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/GuessingPhaseScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/friends-rooms/GuessingPhaseScreen.tsx src/features/friends-rooms/GuessingPhaseScreen.test.tsx
git commit -m "feat(rooms): build the Guess-who identity-assignment endgame screen"
```

### Task 16: `IdentityRevealScreen.tsx` — green/red reveal + leaderboard, wired as Guess-who's finished screen

**Files:**

- Create: `src/features/friends-rooms/IdentityRevealScreen.tsx`
- Create: `src/features/friends-rooms/IdentityRevealScreen.test.tsx`
- Modify: `src/features/friends-rooms/RoomScreen.tsx`
- Modify: `src/features/friends-rooms/RoomScreen.test.tsx`

Design brief §4.3(d)/#3-4: "reveal: show the true mapping, marking each of your guesses green (correct) / red (wrong)... winner/leaderboard." Score is derived client-side from `state.endgame.mapping` vs `state.myGuess` (each correct guess = 1 point) — this is display-only math re-deriving what the backend already scored server-side for the OTHER players' totals; per-viewer this component only has its own guess to grade (`myGuess`), so it cannot itself compute anyone else's score. **This surfaces a real gap this plan flags rather than papering over**: `RoomState` has no field carrying every player's FINAL SCORE (only each viewer's own `myGuess`), so a room-wide leaderboard cannot be built from data already on the wire.

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { IdentityRevealScreen } from "./IdentityRevealScreen";
import { baseRoomState } from "./test-fixtures";

describe("IdentityRevealScreen", () => {
  it("marks each of MY guesses green (correct) or red (wrong) against the true mapping", () => {
    render(
      <IdentityRevealScreen
        state={baseRoomState({
          phase: "finished",
          mode: "guess_who",
          endgame: { kind: "identity_reveal", mapping: { P1: "u1", P2: "u2" } },
          myGuess: { P1: "u1", P2: "u1" },
        })}
      />,
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("P1");
    expect(rows[0].className).toMatch(/live|success/);
    expect(rows[1]).toHaveTextContent("P2");
    expect(rows[1].className).toMatch(/danger/);
  });

  it("renders a note (not a crash) when the score-per-player data isn't on the wire", () => {
    render(
      <IdentityRevealScreen
        state={baseRoomState({
          phase: "finished",
          mode: "guess_who",
          endgame: { kind: "identity_reveal", mapping: { P1: "u1" } },
          myGuess: { P1: "u1" },
        })}
      />,
    );
    expect(screen.getByText(/scores available once/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/IdentityRevealScreen.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { BackButton } from "@/src/shared/components/BackButton";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { RoomState } from "./room-types";

/**
 * Guess-who's finished screen (design brief §4.3(d)/#3-4, §4.4 "Scored
 * results / winner"). Grades ONLY the viewer's own guess against the public
 * `endgame.mapping` (green = correct, red = wrong) — the server never sends
 * anyone else's guess to this client, so this is the one honest computation
 * this screen can do. A full leaderboard needs a PER-PLAYER SCORE field the
 * current `RoomState` contract does not carry (only `myGuess`, the caller's
 * own submission) — flagged explicitly rather than invented: this screen
 * shows a "scores available once every player's total ships" note in place of
 * RoomLeaderboard until that backend field exists. File as a backend follow-up
 * (a `scores: Record<userId, number>` on `RoomState` or on the `identity.
 * revealed` payload) rather than guessing at a shape here.
 */
export function IdentityRevealScreen({ state }: { state: RoomState }) {
  const t = useTranslations("room");
  const mapping = state.endgame?.mapping ?? {};
  const myGuess = state.myGuess ?? {};
  const usernameByUserId = new Map(
    state.players.map((p) => [p.userId, p.username]),
  );
  const labels = Object.keys(mapping);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("identityReveal.heading")}
        </Text>
        <Text as="h1" variant="title" className="text-2xl">
          {state.packTitle}
        </Text>
      </header>

      <BackButton
        href={`/packs/${state.packId}`}
        label={t("results.backToPack")}
      />

      <ol className="flex flex-col gap-2">
        {labels.map((label) => {
          const trueUserId = mapping[label];
          const myGuessUserId = myGuess[label];
          const correct = myGuessUserId === trueUserId;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 rounded-tile border p-3",
                correct
                  ? "border-live/40 bg-live/10"
                  : "border-danger/40 bg-danger/10",
              )}
            >
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-chip bg-white/[0.06] font-mono text-xs font-bold">
                {label}
              </span>
              <Text className="flex-1 text-sm font-semibold">
                {usernameByUserId.get(trueUserId) ?? trueUserId}
              </Text>
              {correct ? (
                <Check size={16} aria-hidden className="text-live" />
              ) : (
                <X size={16} aria-hidden className="text-danger" />
              )}
            </li>
          );
        })}
      </ol>

      <Text variant="tertiary" className="text-sm">
        {t("identityReveal.scoresPending")}
      </Text>
    </div>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/IdentityRevealScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire into `RoomScreen.tsx`'s finished-phase branch**

The existing `state?.phase === "finished"` block always renders `RoomResults` — extend it to check the mode:

```tsx
if (state?.phase === "finished") {
  return (
    <Shell>
      {state.mode === "guess_who" && state.endgame ? (
        <IdentityRevealScreen state={state} />
      ) : (
        <RoomResults state={state} />
      )}
    </Shell>
  );
}
```

Add the import. Add a `RoomScreen.test.tsx` case: a `mode: "guess_who"`, `phase: "finished"`, `endgame` non-null state renders the identity-reveal heading text instead of `RoomResults`' own heading.

- [ ] **Step 6: Run the full suite, typecheck, commit**

Run: `npm test -- src/features/friends-rooms && npm run typecheck`
Expected: PASS.

```bash
git add src/features/friends-rooms/IdentityRevealScreen.tsx src/features/friends-rooms/IdentityRevealScreen.test.tsx src/features/friends-rooms/RoomScreen.tsx src/features/friends-rooms/RoomScreen.test.tsx
git commit -m "feat(rooms): add the Guess-who identity reveal, wired as its finished screen"
```

---

## Group D — Turn-based cut mode (sequential elimination, whose-turn indicator)

### Task 17: `TurnIndicator.tsx` — shared "whose turn" banner (reused by Relay in Group G)

**Files:**

- Create: `src/features/friends-rooms/TurnIndicator.tsx`
- Create: `src/features/friends-rooms/TurnIndicator.test.tsx`

Design brief §3.4/§6: "a consistent affordance for whose turn it is and a clear 'your turn' call-to-action" — shared across Turn-based cut and Relay (the two turn-based modes), built once here since Turn-based cut is built first in the mandated mode order.

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { TurnIndicator } from "./TurnIndicator";

const PLAYERS = [
  {
    userId: "u1",
    username: "Alice",
    avatarKey: null,
    seat: 0,
    connected: true,
    ready: true,
    next: false,
    claimedItemId: null,
  },
  {
    userId: "u2",
    username: "Bob",
    avatarKey: null,
    seat: 1,
    connected: true,
    ready: true,
    next: false,
    claimedItemId: null,
  },
];

describe("TurnIndicator", () => {
  it("shows a distinct 'your turn' CTA state when the viewer holds the turn", () => {
    render(
      <TurnIndicator players={PLAYERS} turnUserId="u1" currentUserId="u1" />,
    );
    expect(screen.getByText(/your turn/i)).toBeInTheDocument();
  });

  it("shows 'waiting for Alice' when someone else holds the turn", () => {
    render(
      <TurnIndicator players={PLAYERS} turnUserId="u1" currentUserId="u2" />,
    );
    expect(screen.getByText(/waiting for alice/i)).toBeInTheDocument();
  });

  it("renders nothing (round over) when turnUserId is null", () => {
    const { container } = render(
      <TurnIndicator players={PLAYERS} turnUserId={null} currentUserId="u2" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/TurnIndicator.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { RoomPlayerState } from "./room-types";

interface TurnIndicatorProps {
  players: RoomPlayerState[];
  /** Whose turn it is right now, or null once the round has resolved (no more
   * turns to take). */
  turnUserId: string | null;
  currentUserId: string | null;
}

/**
 * Shared whose-turn banner (design brief §3.4) for the two turn-based modes,
 * Turn-based cut and Relay. A ring around the current turn-holder's avatar
 * (the "turn-circle visualization" the task brief calls out) plus a text CTA
 * that flips to a stronger, accented state when it is the VIEWER'S OWN turn.
 */
export function TurnIndicator({
  players,
  turnUserId,
  currentUserId,
}: TurnIndicatorProps) {
  const t = useTranslations("room");
  if (!turnUserId) return null;
  const turnPlayer = players.find((p) => p.userId === turnUserId);
  if (!turnPlayer) return null;
  const isMine = turnUserId === currentUserId;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-tile border p-3",
        isMine ? "border-acc bg-acc/10" : "border-border bg-surface",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 flex-none items-center justify-center rounded-full ring-2",
          isMine ? "ring-acc animate-livedot" : "ring-border-strong",
        )}
      >
        <UserAvatar
          username={turnPlayer.username}
          avatarKey={turnPlayer.avatarKey}
          size="sm"
        />
      </span>
      <Text className={cn("text-sm font-semibold", isMine && "text-acc")}>
        {isMine
          ? t("turnIndicator.yourTurn")
          : t("turnIndicator.waitingFor", { name: turnPlayer.username })}
      </Text>
    </div>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/TurnIndicator.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/friends-rooms/TurnIndicator.tsx src/features/friends-rooms/TurnIndicator.test.tsx
git commit -m "feat(rooms): add TurnIndicator, the shared whose-turn banner"
```

### Task 18: `TurnBasedCutBoard.tsx` — the shrinking shared board

**Files:**

- Create: `src/features/friends-rooms/TurnBasedCutBoard.tsx`
- Create: `src/features/friends-rooms/TurnBasedCutBoard.test.tsx`
- Modify: `src/features/friends-rooms/RoomRoundBoard.tsx`
- Modify: `src/features/friends-rooms/RoomRoundBoard.test.tsx`

`RoundState.remainingItemIds` shrinks with every cut; `items` stays the full original board so a cut item can visibly drop out rather than vanish (design brief §4.3(c): "the removed items visibly drop out"). Reuses `RoomItemCard`'s existing status vocabulary — a cut item renders `status="sacrificed"` (already exists, already styled), a remaining one `status="free"` but clickable ONLY on your turn.

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { TurnBasedCutBoard } from "./TurnBasedCutBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("TurnBasedCutBoard", () => {
  it("on your turn, clicking a remaining item calls onCut", async () => {
    const onCut = vi.fn();
    render(
      <TurnBasedCutBoard
        state={baseRoomState({
          mode: "turn_based_cut",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
            remainingItemIds: ["i1", "i2"],
            turnUserId: "u1",
            cuts: [],
          },
        })}
        currentUserId="u1"
        onCut={onCut}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /cut a/i }));
    expect(onCut).toHaveBeenCalledWith("i1");
  });

  it("when it isn't your turn, the board renders but items aren't buttons", () => {
    render(
      <TurnBasedCutBoard
        state={baseRoomState({
          mode: "turn_based_cut",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
            remainingItemIds: ["i1", "i2"],
            turnUserId: "u2",
            cuts: [],
          },
        })}
        currentUserId="u1"
        onCut={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /cut a/i }),
    ).not.toBeInTheDocument();
  });

  it("an already-cut item renders with sacrificed status, not as a live option", () => {
    render(
      <TurnBasedCutBoard
        state={baseRoomState({
          mode: "turn_based_cut",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
            remainingItemIds: ["i2"],
            turnUserId: "u1",
            cuts: [{ userId: "u2", itemId: "i1" }],
          },
        })}
        currentUserId="u1"
        onCut={vi.fn()}
      />,
    );
    expect(screen.getByText(/cut by bob/i)).toBeInTheDocument();
  });
});
```

(The last test's fixture needs `u2` named "Bob" — pass `players` overrides via `baseRoomState`'s default two-player roster, which already names `u2` "Bob".)

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/TurnBasedCutBoard.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { RoomItemCard } from "./RoomItemCard";
import { TurnIndicator } from "./TurnIndicator";
import type { RoomState } from "./room-types";

interface TurnBasedCutBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onCut: (itemId: string) => void;
}

/**
 * Turn-based cut's board (design brief §4.3(c)): the full original board, with
 * every already-cut item visibly dropped to RoomItemCard's existing
 * "sacrificed" status (labeled with WHO cut it, from `round.cuts`) and every
 * remaining item a live cut button ONLY while it's the viewer's own turn.
 */
export function TurnBasedCutBoard({
  state,
  currentUserId,
  onCut,
}: TurnBasedCutBoardProps) {
  const t = useTranslations("room");
  const round = state.round;
  if (!round || !round.remainingItemIds) return null;

  const remaining = new Set(round.remainingItemIds);
  const cutterByItem = new Map(
    (round.cuts ?? []).map((cut) => [cut.itemId, cut.userId]),
  );
  const playerByUserId = new Map(state.players.map((p) => [p.userId, p]));
  const isMyTurn = round.turnUserId === currentUserId;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("round.heading", {
            index: round.index + 1,
            total: state.totalRounds,
          })}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {round.name || t("turnBasedCut.instruction")}
        </Text>
      </header>

      <TurnIndicator
        players={state.players}
        turnUserId={round.turnUserId ?? null}
        currentUserId={currentUserId}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {round.items.map((item, index) => {
          const isRemaining = remaining.has(item.id);
          const cutterUserId = cutterByItem.get(item.id);
          const cutter = cutterUserId ? playerByUserId.get(cutterUserId) : null;
          return (
            <RoomItemCard
              key={item.id}
              item={item}
              index={index}
              format="sacrifice_one"
              status={isRemaining ? "free" : "sacrificed"}
              claimant={cutter}
              onClaim={
                isRemaining && isMyTurn ? () => onCut(item.id) : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
```

> Note: `RoomItemCard` (Task 9) renders its claim-button label via `claimVerbKey(format)` → `"Save"`/`"Sacrifice"` — Turn-based cut is only offered for save_one/sacrifice_one (per `ROOM_MODE_BOUNDS`, Task 1), so it needs the SAME format-aware verb threading `RoomRoundBoard` already gained in Task 9. Thread the real `packFormat` from `RoomRoundBoard`'s existing prop (Task 9's Step 5) into `TurnBasedCutBoard` instead of hardcoding `"sacrifice_one"` above — add a `packFormat` prop to this component mirroring `RoomRound`'s, and pass it through from `RoomRoundBoard`.

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/TurnBasedCutBoard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire into `RoomRoundBoard.tsx`, and add a matching `RoomBetweenBoard` case**

```tsx
    case "turn_based_cut":
      return (
        <TurnBasedCutBoard
          state={state}
          currentUserId={currentUserId}
          packFormat={packFormat}
          onCut={actions.cut}
        />
      );
```

For the between-round beat, Turn-based cut's resolved round is still `kind: "survivor"` (Task 1's `SurvivorRoundResult` carries an optional `cuts` field precisely for this mode) — so it reuses `RoomBetween` exactly like Claim does, no new component needed:

```tsx
    case "turn_based_cut":
      return (
        <RoomBetween state={state} currentUserId={currentUserId} onNext={onNext} packFormat={packFormat} />
      );
```

- [ ] **Step 6: Run the full suite, typecheck, commit**

Run: `npm test -- src/features/friends-rooms && npm run typecheck`
Expected: PASS.

```bash
git add src/features/friends-rooms/TurnBasedCutBoard.tsx src/features/friends-rooms/TurnBasedCutBoard.test.tsx src/features/friends-rooms/RoomRoundBoard.tsx src/features/friends-rooms/RoomRoundBoard.test.tsx src/features/friends-rooms/RoomBetweenBoard.tsx
git commit -m "feat(rooms): add the Turn-based cut shrinking board + turn indicator"
```

### Task 19: Between-round cut history in `RoomBetween`/`RoomResults`

**Files:**

- Modify: `src/features/friends-rooms/RoomBetween.tsx`
- Modify: `src/features/friends-rooms/RoomResults.tsx`

Claim's between-round screen shows one claimant avatar per sacrificed item. Turn-based cut's `SurvivorRoundResult.cuts` carries the ORDER cuts happened in — a single player may cut more than once in a round (board size is player-count-independent), which the per-item claimant map alone doesn't convey. Add an optional ordered cut-history strip.

- [ ] **Step 1: Write the failing test**

Add to `RoomBetween.test.tsx`:

```tsx
it("when the resolved round carries a cuts history, renders it as an ordered strip", () => {
  render(
    <RoomBetween
      state={baseRoomState({
        mode: "turn_based_cut",
        phase: "between",
        packFormat: "sacrifice_one",
        round: {
          index: 0,
          name: "",
          items: [ITEM("i1", "A"), ITEM("i2", "B"), ITEM("i3", "C")],
          claims: {},
          survivorItemId: "i3",
          cuts: [
            { userId: "u1", itemId: "i1" },
            { userId: "u2", itemId: "i2" },
          ],
        },
      })}
      currentUserId="u1"
      onNext={vi.fn()}
    />,
  );
  const history = screen.getByLabelText(/cut order/i);
  expect(history).toHaveTextContent("Alice");
  expect(history).toHaveTextContent("Bob");
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/RoomBetween.test.tsx`
Expected: FAIL — no cut-history strip exists.

- [ ] **Step 3: Implement**

Add below the survivor `<RoomItemCard>` block in `RoomBetween.tsx`, before the "This round's sacrifices" board:

```tsx
{
  round.cuts && round.cuts.length > 0 && (
    <div className="flex flex-col gap-2">
      <Text variant="secondary" className="text-sm">
        {t("turnBasedCut.cutOrderHeading")}
      </Text>
      <ol
        aria-label={t("turnBasedCut.cutOrderHeading")}
        className="flex flex-wrap items-center gap-2"
      >
        {round.cuts.map((cut, index) => {
          const cutter = state.players.find((p) => p.userId === cut.userId);
          const item = round.items.find((i) => i.id === cut.itemId);
          return (
            <li
              key={`${cut.userId}-${cut.itemId}-${index}`}
              className="flex items-center gap-1.5 rounded-pill border border-border bg-surface px-2.5 py-1 text-xs"
            >
              <span className="font-semibold">
                {cutter?.username ?? cut.userId}
              </span>
              <span className="text-foreground-tertiary">
                {t("turnBasedCut.cutVerb")}
              </span>
              <span>{item?.title ?? cut.itemId}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
```

Apply the identical block to `RoomResults.tsx`'s per-round `<section>`, reading `result.cuts` (only present on `kind: "survivor"` results — guard with `result.kind === "survivor" && result.cuts`).

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npm test -- src/features/friends-rooms/RoomBetween.test.tsx src/features/friends-rooms/RoomResults.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/friends-rooms/RoomBetween.tsx src/features/friends-rooms/RoomBetween.test.tsx src/features/friends-rooms/RoomResults.tsx messages/en.json
git commit -m "feat(rooms): show Turn-based cut's ordered cut history between rounds and in results"
```

---

## Group E — Voting mode (live public tally, priority-holder tiebreak)

### Task 20: `PriorityHolderBadge.tsx` — shared crown/badge for the tiebreak role

**Files:**

- Create: `src/features/friends-rooms/PriorityHolderBadge.tsx`
- Create: `src/features/friends-rooms/PriorityHolderBadge.test.tsx`

Design brief §3.2: "Show it as a badge/crown on that player's avatar, visible BEFORE voting... It rotates each round." Uses `--score` (the game amber token — priority is explicitly a scoring/priority concept per the token catalog's own definition, distinct from the moderation-status amber).

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PriorityHolderBadge } from "./PriorityHolderBadge";

describe("PriorityHolderBadge", () => {
  it("names the priority holder and explains what it means", () => {
    render(<PriorityHolderBadge username="Alice" />);
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/breaks ties/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/PriorityHolderBadge.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { Text } from "@/src/shared/components/Text";

/**
 * The rotating tiebreak role's badge (design brief §3.2) — shown BEFORE
 * voting closes so the room knows whom to persuade on a tie. `--score` (game
 * amber: "score, priority, winner") per design-tokens.md, distinct from the
 * moderation-status amber family.
 */
export function PriorityHolderBadge({ username }: { username: string }) {
  const t = useTranslations("room");
  return (
    <div className="flex items-center gap-2 rounded-pill border border-score/30 bg-score/10 px-3 py-1.5">
      <Crown size={14} aria-hidden className="text-score" />
      <Text className="text-xs font-semibold text-score">
        {t("priority.holder", { name: username })}
      </Text>
      <Text variant="tertiary" className="text-[11px]">
        {t("priority.explainer")}
      </Text>
    </div>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/PriorityHolderBadge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/friends-rooms/PriorityHolderBadge.tsx src/features/friends-rooms/PriorityHolderBadge.test.tsx
git commit -m "feat(rooms): add PriorityHolderBadge, the Voting tiebreak role indicator"
```

### Task 21: `VotingBoard.tsx` — live public tally over the format's own option shape

**Files:**

- Create: `src/features/friends-rooms/VotingBoard.tsx`
- Create: `src/features/friends-rooms/VotingBoard.test.tsx`
- Modify: `src/features/friends-rooms/RoomRoundBoard.tsx`
- Modify: `src/features/friends-rooms/RoomRoundBoard.test.tsx`

Design brief §4.3(b): items for save/sacrifice, two items for 1v1, two sides for nxn — the SAME option-set shapes `RoundState.optionIds` already uses for Guess-who (Task 12 established reading `optionIds` generically). Unlike Guess-who, Voting is FULLY PUBLIC and live (`RoundState.votes: Record<userId,optionId>`, changeable until resolve) — the tally bar itself reuses the exact motion token already reserved for it: `.claude/docs/design-tokens.md`'s Motion section literally lists _"vote-tally bar `width .3s`"_ among the signature-easing transitions, unused until now.

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { VotingBoard } from "./VotingBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("VotingBoard", () => {
  it("clicking an option casts a vote, and the live tally shows every option's current count", () => {
    const onVote = vi.fn();
    render(
      <VotingBoard
        state={baseRoomState({
          mode: "voting",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            votes: { u2: "i1" },
            priorityUserId: "u1",
          },
        })}
        currentUserId="u1"
        onVote={onVote}
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument(); // Pizza's live count
  });

  it("a vote can be changed freely — clicking a different option re-votes, no confirmation", async () => {
    const onVote = vi.fn();
    render(
      <VotingBoard
        state={baseRoomState({
          mode: "voting",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            votes: { u1: "i1" },
            priorityUserId: "u1",
          },
        })}
        currentUserId="u1"
        onVote={onVote}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /sushi/i }));
    expect(onVote).toHaveBeenCalledWith("i2");
  });

  it("shows the priority-holder badge", () => {
    render(
      <VotingBoard
        state={baseRoomState({
          mode: "voting",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1"],
            votes: {},
            priorityUserId: "u1",
          },
        })}
        currentUserId="u2"
        onVote={vi.fn()}
      />,
    );
    expect(screen.getByText(/breaks ties/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/VotingBoard.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { PriorityHolderBadge } from "./PriorityHolderBadge";
import type { RoomState } from "./room-types";

interface VotingBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onVote: (optionId: string) => void;
}

/**
 * Voting's round board (design brief §4.3(b)): every option from
 * `round.optionIds`, a live public tally (`round.votes` — no blind concept in
 * this mode), and the priority holder's badge shown BEFORE the round resolves
 * so the room knows whom a tie favors. Casting a vote is free to change at any
 * time before resolution — clicking a different option just re-votes.
 */
export function VotingBoard({
  state,
  currentUserId,
  onVote,
}: VotingBoardProps) {
  const t = useTranslations("room");
  const round = state.round;
  if (!round || !round.optionIds) return null;

  const votes = round.votes ?? {};
  const itemsById = new Map(round.items.map((item) => [item.id, item]));
  const totalVotes = Object.keys(votes).length;
  const myVote = currentUserId ? votes[currentUserId] : undefined;
  const priorityPlayer = state.players.find(
    (p) => p.userId === round.priorityUserId,
  );

  const tally = new Map<string, number>();
  for (const optionId of Object.values(votes)) {
    tally.set(optionId, (tally.get(optionId) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("round.heading", {
            index: round.index + 1,
            total: state.totalRounds,
          })}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {round.name || t("voting.instruction")}
        </Text>
        {priorityPlayer && (
          <PriorityHolderBadge username={priorityPlayer.username} />
        )}
      </header>

      <div className="flex flex-col gap-3">
        {round.optionIds.map((optionId) => {
          const item = itemsById.get(optionId);
          const count = tally.get(optionId) ?? 0;
          const pct =
            totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMine = myVote === optionId;
          return (
            <button
              key={optionId}
              type="button"
              aria-pressed={isMine}
              onClick={() => onVote(optionId)}
              className={cn(
                "relative overflow-hidden rounded-tile border-[1.5px] p-4 text-start transition-colors",
                isMine
                  ? "border-acc"
                  : "border-border hover:border-border-strong",
              )}
            >
              {/* The live tally bar — width is the vote-tally motion token
                  reserved in design-tokens.md ("vote-tally bar width .3s"). */}
              <span
                aria-hidden
                className="absolute inset-y-0 start-0 bg-acc/10 transition-[width] duration-300 ease-[var(--ease-signature)]"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-3">
                <Text className="font-semibold">{item?.title ?? optionId}</Text>
                <Text variant="secondary" className="tabular-nums">
                  {count}
                </Text>
              </div>
            </button>
          );
        })}
      </div>

      <Text variant="secondary" aria-live="polite" className="text-sm">
        {t("voting.votedSoFar", {
          count: totalVotes,
          total: state.players.length,
        })}
      </Text>
    </div>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/VotingBoard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire into `RoomRoundBoard.tsx`**

```tsx
    case "voting":
      return <VotingBoard state={state} currentUserId={currentUserId} onVote={actions.vote} />;
```

- [ ] **Step 6: Run the full suite, commit**

```bash
git add src/features/friends-rooms/VotingBoard.tsx src/features/friends-rooms/VotingBoard.test.tsx src/features/friends-rooms/RoomRoundBoard.tsx src/features/friends-rooms/RoomRoundBoard.test.tsx
git commit -m "feat(rooms): add the Voting round board with live public tally"
```

### Task 22: `VotingBetweenBoard.tsx` — winning-option reveal + tie-break explanation

**Files:**

- Create: `src/features/friends-rooms/VotingBetweenBoard.tsx`
- Create: `src/features/friends-rooms/VotingBetweenBoard.test.tsx`
- Modify: `src/features/friends-rooms/RoomBetweenBoard.tsx`

Design brief §4.3(b): "Between round: show the winning option + countdown, like Claim's survivor screen" plus a tie-break explanation when `VoteResultState.tieBroken` is true. `state.results` only carries RESOLVED rounds; the currently-resolving round's outcome is read off `round` itself once `phase === 'between'` — but Voting's `RoundState` has no resolved-outcome fields (`votes`/`tally` stay live-shaped). The winning option for the CURRENT (just-resolved) round is therefore only available once it lands in `state.results` as a `VoteRoundResult` — read the LAST entry of `state.results` when its `index` matches `state.round.index`.

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { VotingBetweenBoard } from "./VotingBetweenBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("VotingBetweenBoard", () => {
  it("shows the winning option and, when tieBroken, explains the priority tiebreak", () => {
    render(
      <VotingBetweenBoard
        state={baseRoomState({
          mode: "voting",
          phase: "between",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "vote",
              index: 0,
              name: "",
              items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
              optionIds: ["i1", "i2"],
              votes: { u1: "i1", u2: "i2" },
              tally: { i1: 1, i2: 1 },
              winnerOptionId: "i1",
              tieBroken: true,
              priorityUserId: "u1",
            },
          ],
        })}
        currentUserId="u1"
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText("Pizza")).toBeInTheDocument();
    expect(screen.getByText(/tie.*alice/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/VotingBetweenBoard.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import type { RoomState, VoteRoundResult } from "./room-types";

export function VotingBetweenBoard({
  state,
  currentUserId,
  onNext,
}: {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
}) {
  const t = useTranslations("room");
  const round = state.round;
  const result = state.results.find(
    (r): r is VoteRoundResult => r.kind === "vote" && r.index === round?.index,
  );
  if (!round || !result) return null;

  const winner = result.items.find((item) => item.id === result.winnerOptionId);
  const priorityPlayer = state.players.find(
    (p) => p.userId === result.priorityUserId,
  );
  const me = state.players.find((p) => p.userId === currentUserId);
  const ready = state.players.filter((p) => p.next).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("voting.winnerHeading")}
        </Text>
        <Text as="h2" variant="title" className="text-2xl text-success">
          {winner?.title ?? result.winnerOptionId}
        </Text>
      </header>

      {result.tieBroken && priorityPlayer && (
        <Text variant="secondary" className="text-sm">
          {t("voting.tieBrokenNote", { name: priorityPlayer.username })}
        </Text>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="secondary" aria-live="polite" className="text-sm">
          {t("between.ready", { count: ready, total: state.players.length })}
        </Text>
        <Button disabled={Boolean(me?.next)} onClick={onNext}>
          {t("between.next")}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes; wire into `RoomBetweenBoard.tsx`; run the full suite; commit**

```tsx
    case "voting":
      return <VotingBetweenBoard state={state} currentUserId={currentUserId} onNext={onNext} />;
```

```bash
git add src/features/friends-rooms/VotingBetweenBoard.tsx src/features/friends-rooms/VotingBetweenBoard.test.tsx src/features/friends-rooms/RoomBetweenBoard.tsx
git commit -m "feat(rooms): add Voting's winner reveal + tie-break explanation between rounds"
```

---

## Group F — Shared grid mode (blind full-ranking submission, Borda-aggregated reveal)

### Task 23: `SharedGridRankSubmission.tsx` — blind full-ranking submission, reusing `LockedInRoster`

**Files:**

- Create: `src/features/friends-rooms/SharedGridRankSubmission.tsx`
- Create: `src/features/friends-rooms/SharedGridRankSubmission.test.tsx`
- Modify: `src/features/friends-rooms/RoomRoundBoard.tsx`
- Modify: `src/features/friends-rooms/RoomRoundBoard.test.tsx`

Design brief §4.3(e): "Everyone does their own blind ranking (the current solo rank_blind flow, in parallel)." This is the SAME click-to-place-next interaction `RankPlayScreen` already implements solo, and the SAME rank UI Guess-who's `actionKind: "rank"` arm already built in Task 12 — reused directly rather than reimplemented (DRY): this task extracts Task 12's rank-mode block into a small standalone `BlindRankBoard` sub-component both Guess-who and Shared-grid import, since the two are now byte-identical except for which command they call (`onPick` vs `onSubmitRanking`) and which locked-in roster prop they read (both already `round.lockedIn`).

- [ ] **Step 1: Extract the shared rank sub-component**

Create `src/features/friends-rooms/BlindRankBoard.tsx` by moving the `round.actionKind === "rank"` branch's JSX out of `GuessWhoRoundBoard.tsx` (Task 12) verbatim, generalized to accept a mode-agnostic `onSubmit: (ranking: string[]) => void` instead of Guess-who's specific `onPick`:

```tsx
"use client";

import { useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { Item } from "@/src/shared/types/pack";

interface BlindRankBoardProps {
  optionIds: string[];
  itemsById: Map<string, Item>;
  disabled: boolean;
  onSubmit: (ranking: string[]) => void;
}

/**
 * The click-to-place-next blind ranking interaction — extracted from
 * GuessWhoRoundBoard's own `actionKind: "rank"` arm (Task 12) so Shared-grid
 * (whose entire round IS this interaction, not just one arm of it) reuses the
 * identical component rather than a second copy. Mirrors RankPlayScreen's
 * solo click-to-place flow exactly, generalized to report a `string[]`
 * instead of writing solo play's own placements state.
 */
export function BlindRankBoard({
  optionIds,
  itemsById,
  disabled,
  onSubmit,
}: BlindRankBoardProps) {
  const [rankSoFar, setRankSoFar] = useState<string[]>([]);

  function selectNext(optionId: string) {
    if (disabled || rankSoFar.includes(optionId)) return;
    const next = [...rankSoFar, optionId];
    setRankSoFar(next);
    if (next.length === optionIds.length) onSubmit(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {optionIds.map((optionId) => {
        const item = itemsById.get(optionId);
        const placedAt = rankSoFar.indexOf(optionId);
        const placed = placedAt !== -1;
        return (
          <button
            key={optionId}
            type="button"
            disabled={disabled || placed}
            onClick={() => selectNext(optionId)}
            className={cn(
              "flex items-center gap-3 rounded-tile border-[1.5px] p-[14px] text-start transition-colors",
              placed
                ? "border-border opacity-60"
                : "border-dashed border-white/[0.14] hover:border-acc/40",
            )}
          >
            <span
              aria-hidden
              className="flex h-8 w-8 flex-none items-center justify-center rounded-chip bg-white/[0.06] text-[12px] font-semibold"
            >
              {placed ? placedAt + 1 : ""}
            </span>
            <Text className="flex-1 text-sm font-semibold">
              {item?.title ?? optionId}
            </Text>
          </button>
        );
      })}
    </div>
  );
}
```

Update `GuessWhoRoundBoard.tsx`'s rank branch to render `<BlindRankBoard optionIds={round.optionIds} itemsById={itemsById} disabled={iAmLockedIn} onSubmit={onPick} />` in place of its own inline JSX, deleting the now-duplicated `rankSoFar` state and `selectRankNext` function from that file (they move into `BlindRankBoard`). Re-run `npm test -- src/features/friends-rooms/GuessWhoRoundBoard.test.tsx` to confirm the extraction is behavior-preserving (PASS, unchanged assertions).

- [ ] **Step 2: Write the failing test for `SharedGridRankSubmission`**

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { SharedGridRankSubmission } from "./SharedGridRankSubmission";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("SharedGridRankSubmission", () => {
  it("ranking every item in order submits the full ranking", async () => {
    const onSubmitRanking = vi.fn();
    render(
      <SharedGridRankSubmission
        state={baseRoomState({
          mode: "shared_grid",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            lockedIn: [],
          },
        })}
        currentUserId="u1"
        onSubmitRanking={onSubmitRanking}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /a/i }));
    await userEvent.click(screen.getByRole("button", { name: /b/i }));
    expect(onSubmitRanking).toHaveBeenCalledWith(["i1", "i2"]);
  });

  it("shows who's locked in via the shared LockedInRoster", () => {
    render(
      <SharedGridRankSubmission
        state={baseRoomState({
          mode: "shared_grid",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1"],
            lockedIn: ["u1"],
          },
        })}
        currentUserId="u2"
        onSubmitRanking={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/alice.*locked in/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/SharedGridRankSubmission.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { BlindRankBoard } from "./BlindRankBoard";
import { LockedInRoster } from "./LockedInRoster";
import type { RoomState } from "./room-types";

interface SharedGridRankSubmissionProps {
  state: RoomState;
  currentUserId: string | null;
  onSubmitRanking: (ranking: string[]) => void;
}

/**
 * Shared-grid's round board (design brief §4.3(e)): the SAME click-to-place
 * blind ranking as the solo rank_blind flow, done in parallel by everyone in
 * the room — reuses BlindRankBoard (Task 23) and LockedInRoster (Task 11)
 * wholesale, adding only the round chrome.
 */
export function SharedGridRankSubmission({
  state,
  currentUserId,
  onSubmitRanking,
}: SharedGridRankSubmissionProps) {
  const t = useTranslations("room");
  const round = state.round;
  if (!round || !round.optionIds) return null;

  const me = state.players.find((p) => p.userId === currentUserId);
  const iAmLockedIn = Boolean(me && round.lockedIn?.includes(me.userId));
  const itemsById = new Map(round.items.map((item) => [item.id, item]));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("round.heading", {
            index: round.index + 1,
            total: state.totalRounds,
          })}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {round.name || t("sharedGrid.instruction")}
        </Text>
      </header>

      <BlindRankBoard
        optionIds={round.optionIds}
        itemsById={itemsById}
        disabled={iAmLockedIn}
        onSubmit={onSubmitRanking}
      />

      <LockedInRoster players={state.players} lockedIn={round.lockedIn ?? []} />
    </div>
  );
}
```

- [ ] **Step 5: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/SharedGridRankSubmission.test.tsx`
Expected: PASS.

- [ ] **Step 6: Wire into `RoomRoundBoard.tsx`**

```tsx
    case "shared_grid":
      return (
        <SharedGridRankSubmission
          state={state}
          currentUserId={currentUserId}
          onSubmitRanking={actions.submitRanking}
        />
      );
```

- [ ] **Step 7: Run the full suite, commit**

```bash
git add src/features/friends-rooms/BlindRankBoard.tsx src/features/friends-rooms/GuessWhoRoundBoard.tsx src/features/friends-rooms/SharedGridRankSubmission.tsx src/features/friends-rooms/SharedGridRankSubmission.test.tsx src/features/friends-rooms/RoomRoundBoard.tsx src/features/friends-rooms/RoomRoundBoard.test.tsx
git commit -m "feat(rooms): add Shared-grid's blind ranking board, extracting BlindRankBoard for reuse"
```

### Task 24: `BordaRevealBoard.tsx` — the aggregated reveal (scores, tiers, tie explanations)

**Files:**

- Create: `src/features/friends-rooms/BordaRevealBoard.tsx`
- Create: `src/features/friends-rooms/BordaRevealBoard.test.tsx`
- Modify: `src/features/friends-rooms/RoomBetweenBoard.tsx`

Design brief §4.3(e): "the individual rankings are aggregated into one group grid (Borda points; ties... shown as a shared rank)." `BordaRoundResult.order: string[][]` is already grouped into tiers (Task 1) — a tier with more than one id IS the tie; this board renders each tier as one row, sharing a rank number when the tier has multiple entries.

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { BordaRevealBoard } from "./BordaRevealBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("BordaRevealBoard", () => {
  it("renders each tier as a rank row, and a two-item tier shares one rank number with a tie note", () => {
    render(
      <BordaRevealBoard
        state={baseRoomState({
          mode: "shared_grid",
          phase: "between",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B"), ITEM("i3", "C")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "borda",
              index: 0,
              name: "",
              items: [ITEM("i1", "A"), ITEM("i2", "B"), ITEM("i3", "C")],
              scores: { i1: 5, i2: 5, i3: 2 },
              order: [["i1", "i2"], ["i3"]],
              ballots: { u1: ["i1", "i2", "i3"], u2: ["i2", "i1", "i3"] },
            },
          ],
        })}
        currentUserId="u1"
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText(/tied/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/BordaRevealBoard.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { BordaRoundResult, RoomState } from "./room-types";

export function BordaRevealBoard({
  state,
  currentUserId,
  onNext,
}: {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
}) {
  const t = useTranslations("room");
  const round = state.round;
  const result = state.results.find(
    (r): r is BordaRoundResult =>
      r.kind === "borda" && r.index === round?.index,
  );
  if (!round || !result) return null;

  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  const me = state.players.find((p) => p.userId === currentUserId);
  const ready = state.players.filter((p) => p.next).length;

  let rank = 1;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("sharedGrid.aggregateHeading")}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {t("sharedGrid.groupRanking")}
        </Text>
      </header>

      <ol className="flex flex-col gap-2">
        {result.order.map((tier, tierIndex) => {
          const rowRank = rank;
          rank += tier.length;
          const tied = tier.length > 1;
          return (
            <li
              key={tierIndex}
              className={cn(
                "flex flex-col gap-1 rounded-tile border p-3",
                tierIndex === 0
                  ? "border-score/40 bg-score/10"
                  : "border-border bg-surface-card",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-chip bg-white/[0.06] text-xs font-bold tabular-nums">
                  {rowRank}
                </span>
                {tier.map((itemId) => (
                  <Text key={itemId} className="font-semibold">
                    {itemsById.get(itemId)?.title ?? itemId}
                  </Text>
                ))}
                <Text
                  variant="tertiary"
                  className="ms-auto text-xs tabular-nums"
                >
                  {t("sharedGrid.pointsLabel", {
                    count: result.scores[tier[0]] ?? 0,
                  })}
                </Text>
              </div>
              {tied && (
                <Text variant="tertiary" className="text-xs">
                  {t("sharedGrid.tiedNote", { count: tier.length })}
                </Text>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="secondary" aria-live="polite" className="text-sm">
          {t("between.ready", { count: ready, total: state.players.length })}
        </Text>
        <Button disabled={Boolean(me?.next)} onClick={onNext}>
          {t("between.next")}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes; wire into `RoomBetweenBoard.tsx`; run the full suite; commit**

```tsx
    case "shared_grid":
      return <BordaRevealBoard state={state} currentUserId={currentUserId} onNext={onNext} />;
```

```bash
git add src/features/friends-rooms/BordaRevealBoard.tsx src/features/friends-rooms/BordaRevealBoard.test.tsx src/features/friends-rooms/RoomBetweenBoard.tsx
git commit -m "feat(rooms): add Shared-grid's Borda-aggregated reveal with tiered ties"
```

---

## Group G — Relay mode (the one genuinely different interaction — see D2)

### Task 25: `RelayInsertBoard.tsx` — click-a-gap-to-insert into the shared growing ranking

**Files:**

- Create: `src/features/friends-rooms/RelayInsertBoard.tsx`
- Create: `src/features/friends-rooms/RelayInsertBoard.test.tsx`
- Modify: `src/features/friends-rooms/RoomRoundBoard.tsx`
- Modify: `src/features/friends-rooms/RoomRoundBoard.test.tsx`

Implements D2's decision: click-a-gap, not drag-and-drop. `round.relayPlaced` is the ordered list built so far; `round.relayCurrentItemId` is the item awaiting placement. The board renders N+1 "gap" buttons around N already-placed items (before the first, between each pair, after the last) — clicking gap `i` calls `onPlaceItem(currentItemId, i)`, matching the backend's `position` semantics (`placeItem({itemId, position})`, confirmed in `friends-rooms.gateway.ts`'s `readPlacement`). Reuses `TurnIndicator` (Task 17) exactly as Turn-based cut does.

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RelayInsertBoard } from "./RelayInsertBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("RelayInsertBoard", () => {
  it("on your turn, renders one more gap than placed items, and clicking a gap places the current item there", async () => {
    const onPlaceItem = vi.fn();
    render(
      <RelayInsertBoard
        state={baseRoomState({
          mode: "relay",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B"), ITEM("i3", "C")],
            claims: {},
            survivorItemId: null,
            relayOrder: ["i1", "i2", "i3"],
            relayPlaced: ["i1"],
            relayCurrentItemId: "i2",
            relayPlacements: [{ userId: "u1", itemId: "i1" }],
            turnUserId: "u1",
          },
        })}
        currentUserId="u1"
        onPlaceItem={onPlaceItem}
      />,
    );
    // one placed item ("A") -> two gaps: before it, after it.
    const gaps = screen.getAllByRole("button", { name: /insert here/i });
    expect(gaps).toHaveLength(2);
    await userEvent.click(gaps[1]);
    expect(onPlaceItem).toHaveBeenCalledWith("i2", 1);
  });

  it("when it isn't your turn, gaps are not rendered as buttons", () => {
    render(
      <RelayInsertBoard
        state={baseRoomState({
          mode: "relay",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A")],
            claims: {},
            survivorItemId: null,
            relayOrder: ["i1"],
            relayPlaced: [],
            relayCurrentItemId: "i1",
            relayPlacements: [],
            turnUserId: "u2",
          },
        })}
        currentUserId="u1"
        onPlaceItem={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /insert here/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the current item awaiting placement", () => {
    render(
      <RelayInsertBoard
        state={baseRoomState({
          mode: "relay",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
            relayOrder: ["i1", "i2"],
            relayPlaced: [],
            relayCurrentItemId: "i1",
            relayPlacements: [],
            turnUserId: "u1",
          },
        })}
        currentUserId="u1"
        onPlaceItem={vi.fn()}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/RelayInsertBoard.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { TurnIndicator } from "./TurnIndicator";
import type { RoomState } from "./room-types";

interface RelayInsertBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onPlaceItem: (itemId: string, position: number) => void;
}

/**
 * Relay's round board (design brief §4.3(f); this plan's D2 decision point).
 * The whole room builds ONE shared ranking, turn by turn: the player whose
 * turn it is inserts the CURRENT item into the partial ranking at a chosen
 * position — click-a-gap, not drag-and-drop (D2). N placed items -> N+1 gap
 * buttons (before the first, between every pair, after the last); clicking
 * gap `i` calls `onPlaceItem(currentItemId, i)`, matching the wire's
 * `{itemId, position}` shape exactly (velanto-backend
 * friends-rooms.gateway.ts's `readPlacement`).
 */
export function RelayInsertBoard({
  state,
  currentUserId,
  onPlaceItem,
}: RelayInsertBoardProps) {
  const t = useTranslations("room");
  const round = state.round;
  if (!round || !round.relayPlaced || round.relayCurrentItemId === undefined)
    return null;

  const itemsById = new Map(round.items.map((item) => [item.id, item]));
  const placed = round.relayPlaced;
  const currentItem = round.relayCurrentItemId
    ? itemsById.get(round.relayCurrentItemId)
    : null;
  const isMyTurn = round.turnUserId === currentUserId;

  function Gap({ position }: { position: number }) {
    if (!isMyTurn || !round?.relayCurrentItemId) {
      return <div aria-hidden className="h-2 w-full" />;
    }
    return (
      <button
        type="button"
        onClick={() => onPlaceItem(round.relayCurrentItemId!, position)}
        aria-label={t("relay.insertHere")}
        className="group flex h-6 w-full items-center justify-center"
      >
        <span className="h-[2px] w-full rounded-pill bg-white/[0.08] transition-colors group-hover:bg-acc" />
        <Plus
          size={14}
          aria-hidden
          className="absolute text-foreground-tertiary opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-acc"
        />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("round.heading", {
            index: round.index + 1,
            total: state.totalRounds,
          })}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {round.name || t("relay.instruction")}
        </Text>
      </header>

      <TurnIndicator
        players={state.players}
        turnUserId={round.turnUserId ?? null}
        currentUserId={currentUserId}
      />

      {currentItem && (
        <div className="w-full max-w-[230px] self-center overflow-hidden rounded-card border-[1.5px] border-acc bg-background p-4 ring-4 ring-acc/[0.16]">
          <Text
            variant="tertiary"
            className="text-[11px] uppercase tracking-wide text-acc"
          >
            {t("relay.currentItem")}
          </Text>
          <Text className="font-semibold">{currentItem.title}</Text>
        </div>
      )}

      <div className="relative flex flex-col">
        <Gap position={0} />
        {placed.map((itemId, index) => (
          <div key={itemId} className="flex flex-col">
            <div
              className={cn(
                "flex items-center gap-3 rounded-tile border border-border bg-surface-card p-3",
              )}
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-chip bg-white/[0.06] text-xs font-bold tabular-nums">
                {index + 1}
              </span>
              <Text className="font-semibold">
                {itemsById.get(itemId)?.title ?? itemId}
              </Text>
            </div>
            <Gap position={index + 1} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/RelayInsertBoard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire into `RoomRoundBoard.tsx`**

```tsx
    case "relay":
      return (
        <RelayInsertBoard
          state={state}
          currentUserId={currentUserId}
          onPlaceItem={actions.placeItem}
        />
      );
```

- [ ] **Step 6: Run the full suite, commit**

```bash
git add src/features/friends-rooms/RelayInsertBoard.tsx src/features/friends-rooms/RelayInsertBoard.test.tsx src/features/friends-rooms/RoomRoundBoard.tsx src/features/friends-rooms/RoomRoundBoard.test.tsx
git commit -m "feat(rooms): add Relay's click-to-insert shared ranking board (D2)"
```

### Task 26: `RelayBetweenBoard.tsx` — the completed shared ranking + placement history

**Files:**

- Create: `src/features/friends-rooms/RelayBetweenBoard.tsx`
- Create: `src/features/friends-rooms/RelayBetweenBoard.test.tsx`
- Modify: `src/features/friends-rooms/RoomBetweenBoard.tsx`

Mirrors Task 19's Turn-based-cut cut-history strip: `RelayRoundResult.placements` is the ordered "who placed what" record, reused as the same pattern.

- [ ] **Step 1: Write the failing test**

```tsx
import { screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RelayBetweenBoard } from "./RelayBetweenBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("RelayBetweenBoard", () => {
  it("shows the final shared order and the placement history", () => {
    render(
      <RelayBetweenBoard
        state={baseRoomState({
          mode: "relay",
          phase: "between",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "relay",
              index: 0,
              name: "",
              items: [ITEM("i1", "A"), ITEM("i2", "B")],
              order: ["i2", "i1"],
              placements: [
                { userId: "u1", itemId: "i2" },
                { userId: "u2", itemId: "i1" },
              ],
            },
          ],
        })}
        currentUserId="u1"
        onNext={vi.fn()}
      />,
    );
    const list = screen.getByRole("list", { name: /final order/i });
    expect(list).toHaveTextContent("B");
    expect(list).toHaveTextContent("A");
    expect(screen.getByLabelText(/placement history/i)).toHaveTextContent(
      "Alice",
    );
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/RelayBetweenBoard.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import type { RelayRoundResult, RoomState } from "./room-types";

export function RelayBetweenBoard({
  state,
  currentUserId,
  onNext,
}: {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
}) {
  const t = useTranslations("room");
  const round = state.round;
  const result = state.results.find(
    (r): r is RelayRoundResult =>
      r.kind === "relay" && r.index === round?.index,
  );
  if (!round || !result) return null;

  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  const playerByUserId = new Map(state.players.map((p) => [p.userId, p]));
  const me = state.players.find((p) => p.userId === currentUserId);
  const ready = state.players.filter((p) => p.next).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("relay.finalOrderHeading")}
        </Text>
      </header>

      <ol
        aria-label={t("relay.finalOrderHeading")}
        className="flex flex-col gap-2"
      >
        {result.order.map((itemId, index) => (
          <li
            key={itemId}
            className="flex items-center gap-3 rounded-tile border border-border bg-surface-card p-3"
          >
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-chip bg-white/[0.06] text-xs font-bold tabular-nums">
              {index + 1}
            </span>
            <Text className="font-semibold">
              {itemsById.get(itemId)?.title ?? itemId}
            </Text>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2">
        <Text variant="secondary" className="text-sm">
          {t("relay.placementHistoryHeading")}
        </Text>
        <ol
          aria-label={t("relay.placementHistoryHeading")}
          className="flex flex-wrap items-center gap-2"
        >
          {result.placements.map((placement, index) => (
            <li
              key={`${placement.userId}-${placement.itemId}-${index}`}
              className="flex items-center gap-1.5 rounded-pill border border-border bg-surface px-2.5 py-1 text-xs"
            >
              <span className="font-semibold">
                {playerByUserId.get(placement.userId)?.username ??
                  placement.userId}
              </span>
              <span className="text-foreground-tertiary">
                {t("relay.placedVerb")}
              </span>
              <span>
                {itemsById.get(placement.itemId)?.title ?? placement.itemId}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="secondary" aria-live="polite" className="text-sm">
          {t("between.ready", { count: ready, total: state.players.length })}
        </Text>
        <Button disabled={Boolean(me?.next)} onClick={onNext}>
          {t("between.next")}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes; wire into `RoomBetweenBoard.tsx`; run the full suite; commit**

```tsx
    case "relay":
      return <RelayBetweenBoard state={state} currentUserId={currentUserId} onNext={onNext} />;
```

```bash
git add src/features/friends-rooms/RelayBetweenBoard.tsx src/features/friends-rooms/RelayBetweenBoard.test.tsx src/features/friends-rooms/RoomBetweenBoard.tsx
git commit -m "feat(rooms): add Relay's final-order + placement-history between-round screen"
```

---

## Group H — Results screen generalization, i18n, e2e, final gates

### Task 27: Generalize `RoomResults.tsx` to render every `RoundResult.kind`

**Files:**

- Modify: `src/features/friends-rooms/RoomResults.tsx`
- Modify: `src/features/friends-rooms/RoomResults.test.tsx`

Today `RoomResults` assumes every entry in `state.results` is a Claim survivor block. It is reached only for the five "shared-verdict" modes (`claim`, `turn_based_cut`, `voting`, `shared_grid`, `relay` — `guess_who`'s `finished` phase routes to `IdentityRevealScreen` instead, per Task 16), so it now needs a per-round `switch (result.kind)`, reusing each mode's own between-round visual block as a static per-round summary rather than inventing a sixth rendering.

- [ ] **Step 1: Write the failing test**

Add to `RoomResults.test.tsx`:

```tsx
it("renders a vote-kind round with its winning option and tally, not the claim survivor board", () => {
  render(
    <RoomResults
      state={baseRoomState({
        mode: "voting",
        phase: "finished",
        packFormat: undefined,
        results: [
          {
            kind: "vote",
            index: 0,
            name: "Round 1",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            optionIds: ["i1", "i2"],
            votes: { u1: "i1" },
            tally: { i1: 1 },
            winnerOptionId: "i1",
            tieBroken: false,
            priorityUserId: "u1",
          },
        ],
      })}
    />,
  );
  expect(screen.getByText("Pizza")).toBeInTheDocument();
});

it("renders a borda-kind round with its tiered order", () => {
  render(
    <RoomResults
      state={baseRoomState({
        mode: "shared_grid",
        phase: "finished",
        results: [
          {
            kind: "borda",
            index: 0,
            name: "Round 1",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            scores: { i1: 3, i2: 1 },
            order: [["i1"], ["i2"]],
            ballots: {},
          },
        ],
      })}
    />,
  );
  expect(screen.getByText("A")).toBeInTheDocument();
  expect(screen.getByText("B")).toBeInTheDocument();
});

it("renders a relay-kind round with its final flat order", () => {
  render(
    <RoomResults
      state={baseRoomState({
        mode: "relay",
        phase: "finished",
        results: [
          {
            kind: "relay",
            index: 0,
            name: "Round 1",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            order: ["i2", "i1"],
            placements: [],
          },
        ],
      })}
    />,
  );
  expect(screen.getByText("A")).toBeInTheDocument();
  expect(screen.getByText("B")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/friends-rooms/RoomResults.test.tsx`
Expected: FAIL — every non-`survivor` result kind currently renders nothing (the existing code unconditionally reads `result.survivorItemId`/`result.claims`, which don't exist on the other four kinds).

- [ ] **Step 3: Implement**

Replace the body of the `state.results.map(...)` block with a per-kind switch, extracting each kind's row rendering into a small local function so the file stays readable:

```tsx
{
  state.results.map((result) => (
    <section
      key={result.index}
      aria-label={t("results.roundLabel", { index: result.index + 1 })}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/40 p-5"
    >
      <Text variant="title" className="text-sm">
        {result.name || t("results.roundLabel", { index: result.index + 1 })}
      </Text>
      {result.kind === "survivor" && (
        <SurvivorResultBlock
          result={result}
          byId={byId}
          packFormat={packFormat}
        />
      )}
      {result.kind === "vote" && (
        <VoteResultBlock result={result} byId={byId} />
      )}
      {result.kind === "borda" && <BordaResultBlock result={result} />}
      {result.kind === "relay" && (
        <RelayResultBlock result={result} byId={byId} />
      )}
    </section>
  ));
}
```

Add the four block components at the bottom of the file (each takes only the one result kind it renders, never the whole union, so a mismatched call is a compile error rather than a runtime `undefined`):

```tsx
function SurvivorResultBlock({
  result,
  byId,
  packFormat,
}: {
  result: SurvivorRoundResult;
  byId: Map<string, RoomPlayerState>;
  packFormat: Extract<Pack["format"], "save_one" | "sacrifice_one">;
}) {
  const claimantFor = (itemId: string): RoomPlayerState | null => {
    for (const [userId, claimed] of Object.entries(result.claims)) {
      if (claimed === itemId) return byId.get(userId) ?? null;
    }
    return null;
  };
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {result.items.map((item, index) => {
        const isSurvivor = item.id === result.survivorItemId;
        return (
          <RoomItemCard
            key={item.id}
            item={item}
            index={index}
            format={packFormat}
            status={isSurvivor ? "survivor" : "sacrificed"}
            claimant={isSurvivor ? null : claimantFor(item.id)}
          />
        );
      })}
    </div>
  );
}

function VoteResultBlock({
  result,
  byId,
}: {
  result: VoteRoundResult;
  byId: Map<string, RoomPlayerState>;
}) {
  const t = useTranslations("room");
  const winner = result.items.find((item) => item.id === result.winnerOptionId);
  const priorityPlayer = byId.get(result.priorityUserId);
  return (
    <div className="flex flex-col gap-2">
      <Text className="text-lg font-semibold text-success">
        {winner?.title}
      </Text>
      {result.tieBroken && priorityPlayer && (
        <Text variant="tertiary" className="text-xs">
          {t("voting.tieBrokenNote", { name: priorityPlayer.username })}
        </Text>
      )}
    </div>
  );
}

function BordaResultBlock({ result }: { result: BordaRoundResult }) {
  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  return (
    <ol className="flex flex-col gap-1">
      {result.order.map((tier, index) => (
        <li key={index} className="text-sm">
          <span className="font-semibold">{index + 1}.</span>{" "}
          {tier.map((id) => itemsById.get(id)?.title ?? id).join(" / ")}
        </li>
      ))}
    </ol>
  );
}

function RelayResultBlock({
  result,
  byId: _byId,
}: {
  result: RelayRoundResult;
  byId: Map<string, RoomPlayerState>;
}) {
  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  return (
    <ol className="flex flex-col gap-1">
      {result.order.map((id, index) => (
        <li key={id} className="text-sm">
          <span className="font-semibold">{index + 1}.</span>{" "}
          {itemsById.get(id)?.title ?? id}
        </li>
      ))}
    </ol>
  );
}
```

(`RelayResultBlock`'s unused `_byId` parameter is intentionally prefixed to satisfy the lint rule for an unused-but-signature-required argument — remove it entirely instead if the lint config flags even a prefixed unused param; check `.eslintrc`'s `no-unused-vars` argsIgnorePattern before deciding.)

Add `packFormat: Extract<Pack["format"], "save_one" | "sacrifice_one"> | undefined` to `RoomResults`'s own props (threaded the same way Task 9 threaded it into `RoomBetween`/`RoomRound`), defaulting to `"sacrifice_one"` at the call site in `RoomScreen.tsx` exactly like Task 9's other two call sites.

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- src/features/friends-rooms/RoomResults.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npm test -- src/features/friends-rooms && npm run typecheck`
Expected: PASS — this should be the point where `npm run typecheck` is fully clean across the whole `friends-rooms` feature for the first time since Task 1's Step 5 broke it.

- [ ] **Step 6: Commit**

```bash
git add src/features/friends-rooms/RoomResults.tsx src/features/friends-rooms/RoomResults.test.tsx
git commit -m "feat(rooms): generalize RoomResults to render every RoundResult kind"
```

### Task 28: i18n — add every new `room.*` key to `messages/en.json`

**Files:**

- Modify: `messages/en.json`

Every task above (9, 10, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27) introduced new `t("room....")` calls. This task is the single consolidated pass adding every one of them to the English catalog in one place, so Task 29's per-locale translation pass has one finished source to translate FROM rather than seven partial diffs. Cross-check every `t(...)` call site added in Tasks 9–27 against this list before considering the task done — this list is exhaustive as of this plan, but the implementing engineer must re-grep `t("` calls under `src/features/friends-rooms/*.tsx` created/modified since Task 8 and confirm every key resolves, since a plan cannot guarantee it enumerated literally every string an engineer's exact code ends up calling.

- [ ] **Step 1: Write the failing test**

Add a new test file `messages/en-room-keys.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import en from "./en.json";

describe("room i18n keys (2.0.0 rooms-UI plan)", () => {
  const room = en.room as Record<string, unknown>;

  it("has every new namespace this plan's tasks introduced", () => {
    for (const namespace of [
      "modePicker",
      "modes",
      "guessWho",
      "guessing",
      "identityReveal",
      "turnBasedCut",
      "voting",
      "sharedGrid",
      "relay",
      "lockedIn",
      "priority",
      "turnIndicator",
      "leaderboard",
    ]) {
      expect(room[namespace]).toBeDefined();
    }
  });

  it("has a name/blurb pair for every ROOM_MODE (matches room-mode-copy.ts's key shape)", () => {
    const modes = room.modes as Record<string, { name: string; blurb: string }>;
    for (const mode of [
      "claim",
      "guess_who",
      "turn_based_cut",
      "voting",
      "shared_grid",
      "relay",
    ]) {
      expect(modes[mode]?.name).toBeTruthy();
      expect(modes[mode]?.blurb).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- messages/en-room-keys.test.ts`
Expected: FAIL — none of the new namespaces exist yet.

- [ ] **Step 3: Add every key to `messages/en.json`'s `room` namespace**

Add these new top-level entries inside `"room": { ... }` (alongside the existing `entry`/`lobby`/`round`/`between`/`results`/`ended`/`joinLink`/`leave`/`leaveConfirm`/`presence`/`kick`/`kicked`, all of which are Task 9/10's already-modified shape):

```json
  "modePicker": {
    "heading": "Game mode",
    "hostIsChoosing": "The host is choosing a mode…",
    "playerRange": "{min}–{max} players"
  },
  "modes": {
    "claim": { "name": "Claim", "blurb": "Everyone claims one item; the unclaimed one survives." },
    "guess_who": { "name": "Guess Who", "blurb": "Pick blind, watch anonymous builds accumulate, then guess who's who." },
    "turn_based_cut": { "name": "Turn-based Cut", "blurb": "Take turns removing one item until only one remains." },
    "voting": { "name": "Voting", "blurb": "Everyone votes; majority wins, priority breaks ties." },
    "shared_grid": { "name": "Shared Grid", "blurb": "Everyone ranks blind; rankings combine into one group order." },
    "relay": { "name": "Relay", "blurb": "Build one shared ranking together, taking turns placing each item." }
  },
  "guessWho": {
    "roundInstruction": "Make your pick",
    "pickInstruction": "Choose blind — nobody sees your pick until everyone has chosen.",
    "rankInstruction": "Rank every item blind, in order.",
    "revealHeading": "Revealed",
    "trajectoryHeading": "Who picked what",
    "roundColumn": "Round"
  },
  "guessing": {
    "heading": "Final round",
    "title": "Who's who?",
    "instruction": "Assign each player to the label you think they played as.",
    "chooseSomeone": "Choose a player…",
    "submit": "Submit guesses",
    "waitingForOthers": "{count} / {total} have submitted"
  },
  "identityReveal": {
    "heading": "Reveal",
    "scoresPending": "Full scores available once every player's total is on the wire."
  },
  "turnBasedCut": {
    "instruction": "On your turn, cut one item. The last one standing wins.",
    "cutOrderHeading": "Cut order",
    "cutVerb": "cut"
  },
  "voting": {
    "instruction": "Vote for one option. You can change your vote until the round closes.",
    "votedSoFar": "{count} / {total} have voted",
    "winnerHeading": "Winner",
    "tieBrokenNote": "It was a tie — {name} held priority and broke it."
  },
  "sharedGrid": {
    "instruction": "Rank every item blind, in order.",
    "aggregateHeading": "Aggregated",
    "groupRanking": "The group's ranking",
    "pointsLabel": "{count} pts",
    "tiedNote": "{count}-way tie"
  },
  "relay": {
    "instruction": "Insert the current item into the shared ranking.",
    "insertHere": "Insert here",
    "currentItem": "Now placing",
    "finalOrderHeading": "Final order",
    "placementHistoryHeading": "Placement history",
    "placedVerb": "placed"
  },
  "lockedIn": {
    "playerLocked": "{name} — locked in",
    "playerWaiting": "{name} — still deciding",
    "count": "{count} / {total} locked in"
  },
  "priority": {
    "holder": "{name} holds priority",
    "explainer": "breaks ties this round"
  },
  "turnIndicator": {
    "yourTurn": "Your turn",
    "waitingFor": "Waiting for {name}"
  },
  "leaderboard": {
    "winner": "Winner",
    "points": "{count} pts"
  },
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- messages/en-room-keys.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full test suite one more time to catch any `t("room....")` call site this consolidation missed**

Run: `npm test -- src/features/friends-rooms`
Expected: PASS. Any remaining failure at this point is a missing key this task's Step 3 list did not anticipate — add it to both `en.json` and this task's own key list before moving on, so Task 29 translates a complete catalog.

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/en-room-keys.test.ts
git commit -m "feat(rooms): consolidate every new room i18n key into the English catalog"
```

### Task 29: i18n — translate the new keys into the other 7 locale catalogs

**Files:**

- Modify: `messages/zh.json`, `messages/hi.json`, `messages/ar.json`, `messages/bn.json`, `messages/ru.json`, `messages/ur.json`, `messages/uk.json`

Every key Task 28 added to `messages/en.json`'s `room` namespace needs the identical key structure in the other 7 catalogs, per the workspace's established i18n discipline (`.claude/CLAUDE.md`'s "8 locales" requirement) — this is real translation work, not English-fallback copy-paste: `ar`/`ur` are RTL (already handled by the app's existing `RTL_LOCALES` mechanism — no per-string RTL markup needed, just correct translated text), and every `{placeholder}` token (`{name}`, `{count}`, `{total}`, `{min}`, `{max}`) must be preserved verbatim in each translation since next-intl interpolates by token name, not position.

- [ ] **Step 1: Write the failing test**

Extend `src/shared/types/cross-repo-drift.test.ts`'s existing "every LOCALE has a messages/<locale>.json catalog" invariant test with a room-specific structural check — add to `messages/en-room-keys.test.ts` (Task 28):

```ts
import { LOCALES } from "@/src/i18n/config";

describe("room i18n keys exist in every locale catalog", () => {
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    it(`messages/${locale}.json has every new room namespace`, async () => {
      const catalog = (await import(`./${locale}.json`)).default as Record<
        string,
        unknown
      >;
      const room = catalog.room as Record<string, unknown> | undefined;
      expect(room).toBeDefined();
      for (const namespace of [
        "modePicker",
        "modes",
        "guessWho",
        "guessing",
        "identityReveal",
        "turnBasedCut",
        "voting",
        "sharedGrid",
        "relay",
        "lockedIn",
        "priority",
        "turnIndicator",
        "leaderboard",
      ]) {
        expect(room![namespace]).toBeDefined();
      }
    });
  }
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- messages/en-room-keys.test.ts`
Expected: FAIL for all 7 non-English locales.

- [ ] **Step 3: Add the translated key blocks to each of the 7 catalogs**

For each of `zh`/`hi`/`ar`/`bn`/`ru`/`ur`/`uk`, add the same 13 namespaces Task 28 Step 3 added to `en.json`, with every string professionally translated into that locale (not machine-transliterated English) and every `{placeholder}` token preserved exactly. This is genuine translation work with no shortcut available from this plan — the implementing engineer (or a translation pass reviewed by someone fluent) must produce real copy for all 7 × 13 namespaces. As a concrete starting point, mirror the EXACT translation register the existing `room.entry`/`room.lobby`/`room.round` keys already use in each of these 7 catalogs today (they exist already, translated, for the old Claim-only surface) — read `messages/<locale>.json`'s existing `room` block first so the new keys' tone/formality matches what's already shipped in that locale rather than introducing a second voice within the same namespace.

- [ ] **Step 4: Run the test, confirm it passes for all 7 locales**

Run: `npm test -- messages/en-room-keys.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full test suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add messages/zh.json messages/hi.json messages/ar.json messages/bn.json messages/ru.json messages/ur.json messages/uk.json messages/en-room-keys.test.ts
git commit -m "feat(rooms): translate the new room i18n keys into all 7 remaining locales"
```

### Task 30: Playwright e2e — Claim and Guess-who golden paths

**Files:**

- Create: `e2e/rooms.spec.ts`

Per `.claude/docs/testing-requirements.md`: "Cover the golden path per feature area once it exists... plus at least one broken/edge path." Six full-game e2e runs (one per mode) against a live backend would be a large, slow surface for one plan to add in one pass — this task covers the two highest-value paths: **Claim** (the restored golden path that existed before the dormancy, proving the rebuild didn't regress it) and **Guess Who** (the richest new mode, proving the mode picker → blind round → reveal → guessing → identity-reveal pipeline works end to end). The remaining four modes (Turn-based cut, Voting, Shared-grid, Relay) have full component-level test coverage from their own task groups but no dedicated e2e in this plan — flagged explicitly as follow-up scope, not silently dropped.

- [ ] **Step 1: Write the Claim golden-path spec**

```ts
import { test, expect } from "@playwright/test";
import { loginAsTestUser, createTestPack, createTestUser } from "./helpers";

test.describe("Rooms — Claim mode golden path", () => {
  test("host creates a room, sets Claim, both players ready, play a round to the survivor", async ({
    browser,
  }) => {
    const pack = await createTestPack({ format: "save_one" });
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await loginAsTestUser(hostPage);
    await hostPage.goto(`/packs/${pack.id}`);
    await hostPage.getByRole("button", { name: /create room/i }).click();
    await expect(hostPage).toHaveURL(/\/rooms\//);

    await hostPage.getByRole("button", { name: /claim/i }).click();
    await hostPage.getByRole("button", { name: /copy code/i }).click();
    const code = await hostPage.evaluate(() => navigator.clipboard.readText());

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await loginAsTestUser(guestPage, await createTestUser());
    await guestPage.goto(`/rooms/join/${code}`);
    await expect(guestPage).toHaveURL(/\/rooms\//);

    await hostPage.getByRole("button", { name: /ready/i }).click();
    await guestPage.getByRole("button", { name: /ready/i }).click();

    await expect(hostPage.getByText(/round 1/i)).toBeVisible();
    const items = hostPage.getByRole("button", { name: /save|sacrifice/i });
    await items.first().click();
    await guestPage
      .getByRole("button", { name: /save|sacrifice/i })
      .nth(1)
      .click();

    await expect(hostPage.getByText(/survivor|saved/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Write the Guess-who golden-path spec**

```ts
test.describe("Rooms — Guess Who golden path", () => {
  test("mode picker to identity reveal, three players, one full round", async ({
    browser,
  }) => {
    const pack = await createTestPack({
      format: "save_one",
      rounds: 5,
      poolSize: 8,
    });
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    const pages = await Promise.all(contexts.map((c) => c.newPage()));
    await Promise.all(pages.map((p) => loginAsTestUser(p)));

    await pages[0].goto(`/packs/${pack.id}`);
    await pages[0].getByRole("button", { name: /create room/i }).click();
    await pages[0].getByRole("button", { name: /guess who/i }).click();
    const url = pages[0].url();
    const roomId = url.split("/rooms/")[1];
    await pages[1].goto(url);
    await pages[2].goto(url);

    for (const page of pages) {
      await page.getByRole("button", { name: /ready/i }).click();
    }

    for (const page of pages) {
      await expect(page.getByText(/round 1/i)).toBeVisible();
    }
    // Every player makes a blind pick — assert the lock-in count climbs to 3/3
    // without any page ever showing another player's choice.
    for (const page of pages) {
      await page.getByRole("button").first().click();
    }
    await expect(pages[0].getByText("3 / 3")).toBeVisible();
    await expect(pages[0].getByText(/who picked what/i)).toBeVisible();
  });
});
```

- [ ] **Step 3: Run the specs against a live local backend**

Run: `npm run test:e2e -- e2e/rooms.spec.ts`
Expected: PASS. Requires the backend dev server running locally with `ROOMS_DORMANT` already flipped in the WORKING TREE (Task 31 does this repo-wide — for this task's local run only, temporarily flip the constant, run the spec, then revert if Task 31 hasn't landed yet in the same session).

- [ ] **Step 4: Commit**

```bash
git add e2e/rooms.spec.ts
git commit -m "test(rooms): add Playwright e2e golden paths for Claim and Guess Who"
```

### Task 31: Flip `ROOMS_DORMANT` to `false`

**Files:**

- Modify: `src/features/friends-rooms/room-types.ts`
- Modify: every test that asserted dormant behavior as its expected state (`RoomPresenceIndicator.test.tsx`, `JoinByLink.test.tsx`, `PackDetailScreen.test.tsx`, `JoinRoomCard.test.tsx` — grep `ROOMS_DORMANT` across the repo to find every call site)

The one-line flip this whole plan has been building toward (D3). Only done after every mode's UI (Tasks 9–27), its i18n (Tasks 28–29), and its e2e coverage (Task 30) are in.

- [ ] **Step 1: Grep every consumer of `ROOMS_DORMANT` to build the full list of tests that assert dormant behavior**

Run: `grep -rn "ROOMS_DORMANT" src/ app/`
Expected output includes (at minimum, confirmed this session): `room-types.ts` (the const itself), `friends-rooms-presence-context.tsx`, `JoinByLink.tsx`, `JoinRoomCard.tsx`, `PackDetailScreen.tsx` (Task 8), plus each of those files' own `.test.tsx`.

- [ ] **Step 2: Flip the constant**

In `room-types.ts`:

```ts
export const ROOMS_DORMANT: boolean = false;
```

- [ ] **Step 3: Update every test from Step 1's list that hard-coded the dormant expectation**

For each: where a test asserted "renders nothing" / "shows the not-found dead-end" specifically BECAUSE of dormancy, either (a) delete the test if Tasks 1–30 already added the equivalent "revived" behavior test elsewhere (e.g. `PackDetailScreen.test.tsx`'s Task 8 dormant-hides test becomes obsolete — replace it with a test asserting `FriendsRoomEntry` NOW renders), or (b) if the file has no revived-behavior test yet, add one alongside rather than only deleting the dormant one — every entry point needs at least one test proving it now actually works, not just that its old guard is gone.

`PackDetailScreen.test.tsx` — replace Task 8's test:

```tsx
it("renders the room entry now that rooms are live", () => {
  render(<PackDetailScreen pack={makeTestPack()} />);
  expect(
    screen.getByRole("button", { name: /create room/i }),
  ).toBeInTheDocument();
});
```

`JoinRoomCard.test.tsx` — replace its dormant "renders nothing" test with one asserting the card renders its join form.

`friends-rooms-presence-context.test.tsx` — replace its "skips the /mine poll while dormant" test with one asserting the poll now fires (mock `friendsRoomsClient.mine` and assert it was called).

`JoinByLink.test.tsx` — replace its dormant "always lands on not-found" test with the ordinary join-flow tests the component's own logic (already written pre-dormancy, still present in the file, currently short-circuited by the `if (ROOMS_DORMANT)` seed) already covers — confirm those pre-existing tests now execute their real path instead of the dormant seed and still pass.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS, zero skipped/dormant-only tests remaining for the rooms feature.

- [ ] **Step 5: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(rooms): flip ROOMS_DORMANT — the universal room/mode surface is live"
```

### Task 32: Final gates — full suite, build, and review

**Files:** none (verification-only task)

- [ ] **Step 1: Full unit/component suite**

Run: `npm test`
Expected: PASS, 0 failures.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS, 0 errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS, 0 errors (warnings reviewed on their merits).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS — this is the first point a Next.js production build has run against the fully-revived rooms surface; a build-only failure (e.g. a server/client component boundary issue in one of the 20+ new `"use client"` files) would not show up in `npm test` alone.

- [ ] **Step 5: Full Playwright e2e suite**

Run: `npm run test:e2e`
Expected: PASS, including Task 30's two new room specs and every pre-existing spec (regression guard — confirms the rooms revival didn't break create/play/result flows elsewhere).

- [ ] **Step 6: Dispatch `pr-review-toolkit:code-reviewer` and `ui-guardian` over the full diff**

Per this repo's established workflow (`.claude/docs/git-workflow.md`, `.claude/CLAUDE.md`'s "Custom review agents") and `.claude/docs/agent-usage-strategy.md`'s explicit "pre-PR review: code-reviewer + ui-guardian in parallel" default. Scope both to the full diff produced by Tasks 1–31 (this is a large diff — do not scope to "just the last task"). Address every finding before opening the PR; do not merge on local checks alone (this repo's own `agent-usage-strategy.md`: "the delegating session reviews the diff and independently re-verifies checks before merging").

- [ ] **Step 7: Open the PR**

Follow `.claude/workflows/pull-request.md`. Target branch: whatever feature/integration branch this plan's own worktree was branched from (confirm via `git log --oneline -1 --all --source` or the workflow's own branch-naming convention) — per the workspace's release-branch discipline (`feedback_release_branch_not_optional` in project memory), a sub-branch of a `release/2.0.0`-rooted branch self-merges up to the release branch freely; a PR into `develop`/`main` needs explicit owner sign-off first. Do not merge this PR without that sign-off if the target is `develop` or `main`.

---

## Self-review

**Spec coverage** — every named requirement in the dispatch brief maps to a task:

- Lobby (mode picker, ready-toggle, host controls, join-by-code) → Tasks 5, 8 (join-by-code/create already existed and are re-mounted)
- Claim round screen + anti-script feedback → Tasks 9, 10
- Guess-who blind pick/rank, locked-in, reveal, identity endgame → Tasks 11, 12, 13, 15, 16
- Turn-based cut shrinking board + turn indicator → Tasks 17, 18, 19
- Voting live tally + priority badge + tie explanation → Tasks 20, 21, 22
- Shared-grid blind ranking + Borda reveal → Tasks 23, 24
- Relay insertion board + placement history → Tasks 25, 26 (D2 decision point addressed explicitly)
- Results/end-of-game screen → Task 27 (+ Task 16 for the scored variant)
- Presence/connection UI → Task 7 (fix), confirmed reused unchanged elsewhere
- i18n across 8 locales → Tasks 28, 29
- e2e + gates → Tasks 30, 31, 32

**Placeholder scan** — no `TBD`/`TODO`/"add appropriate error handling" strings appear in any task's code; every code block is complete, typed, and named consistently with Task 1's contract. Task 16 and Task 30 both explicitly flag real, unresolved gaps (the missing per-player score field; the four modes without dedicated e2e) rather than inventing a fix or silently omitting the gap — this is a documented decision, not a placeholder.

**Type consistency** — `RoomRoundActions` (Task 6) is the single shape every mode's round board destructures from; `RoomMode`/`RoundResult`/`AvailableMode`/`ROOM_MODE_BOUNDS` are defined exactly once (Task 1) and every later task imports rather than redefines them. `packFormat` threading (Task 9) is consistent across `RoomRound`/`RoomBetween`/`RoomResults`/`TurnBasedCutBoard`/`RoomItemCard`.
