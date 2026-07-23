import { z } from "zod";
import { resolveRoundDraws } from "@/src/shared/lib/round-draw";
import {
  ELIMINATION_MIN_DRAW,
  ELIMINATION_MAX_DRAW,
  FRIENDS_ROUND_DRAW,
  NXN_SIDE_COUNT_MAX,
  NXN_SIDE_COUNT_MIN,
  type PackDraft,
} from "@/src/features/create/create-pack.value-schemas";

// Mirrors velanto-backend create-pack.dto.ts `.superRefine()`: the client
// rejects exactly the packs the API rejects. Groups are reusable pools; rounds
// draw from them with per-group dedup. Soft under-fill warnings (a round drawing
// fewer than its configured count) are a UI concern shown inline by RoundsEditor
// via resolveRoundDraws — NOT a blocking error here. Only a 0-draw round blocks.

// Shared across all formats: at least one named group with items, at least one
// round, and every slot must reference an existing group.
function validateGroupsAndRefs(pack: PackDraft, ctx: z.RefinementCtx): boolean {
  let ok = true;
  if (pack.groups.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["groups"],
      message: "Add at least one group.",
    });
    ok = false;
  }
  pack.groups.forEach((group, index) => {
    if (!group.name.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["groups", index, "name"],
        message: "Every group needs a name.",
      });
      ok = false;
    }
    if (group.items.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["groups", index, "items"],
        message: `Group "${group.name}" needs at least one item.`,
      });
      ok = false;
    }
  });

  if (pack.rounds.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["rounds"],
      message: "Add at least one round.",
    });
    ok = false;
  }

  const groupIds = new Set(pack.groups.map((group) => group.id));
  const pinnedGroupIds = new Set<string>();
  let randomSlotCount = 0;
  pack.rounds.forEach((round, ri) => {
    round.slots.forEach((slot, si) => {
      // A random-pool slot names no group by design — nothing to pick.
      if (slot.groupMode === "random") {
        randomSlotCount += 1;
        return;
      }
      if (slot.groupId) pinnedGroupIds.add(slot.groupId);
      if (!slot.groupId || !groupIds.has(slot.groupId)) {
        ctx.addIssue({
          code: "custom",
          path: ["rounds", ri, "slots", si, "groupId"],
          message: "Pick a group for this round.",
        });
        ok = false;
      }
    });
  });

  // A random pool is consumed once drawn — gone for every other random slot in
  // the pack — and a pinned pool is never drawn at all. So the pack can only
  // afford as many random slots as it has pools left over after pinning.
  // Mirrors velanto-backend create-pack.dto.ts.
  const availablePools = pack.groups.length - pinnedGroupIds.size;
  if (randomSlotCount > availablePools) {
    ctx.addIssue({
      code: "custom",
      path: ["rounds"],
      message: `This pack needs ${randomSlotCount} random pools but only ${availablePools} ${availablePools === 1 ? "is" : "are"} available.`,
    });
    ok = false;
  }
  return ok;
}

// A 0-draw round (all its items consumed by earlier rounds sharing the group)
// is a hard error in both repos; under-fill is only a soft UI warning.
function validateFeasibility(pack: PackDraft, ctx: z.RefinementCtx) {
  const resolved = resolveRoundDraws(pack.groups, pack.rounds);
  resolved.forEach((round, ri) => {
    round.slots.forEach((slot, si) => {
      if (slot.mode === "random" && slot.drawnCount <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["rounds", ri, "slots", si],
          message: "This round has no items left to draw.",
        });
      }
    });
  });
}

// save_one / sacrifice_one / rank_blind: every round is a single-slot draw whose
// effective count (random → count, manual → group item count) is at least 2.
export function validateElimination(pack: PackDraft, ctx: z.RefinementCtx) {
  const groupsOk = validateGroupsAndRefs(pack, ctx);
  const groupById = new Map(pack.groups.map((group) => [group.id, group]));
  // Manually-pinned item ids seen so far, per group — an item may be placed in
  // only one slot across the whole pack (it's reserved out of the pool).
  const pinnedByGroup = new Map<string, Set<string>>();

  pack.rounds.forEach((round, ri) => {
    if (round.slots.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["rounds", ri, "slots"],
        message: "This round needs exactly one group.",
      });
      return;
    }
    const slot = round.slots[0];
    const group =
      slot.groupMode === "random" ? undefined : groupById.get(slot.groupId!);
    // A fixed slot with no group already reported a dangling ref above; a
    // random one legitimately has none, and its count is still checked below.
    if (!group && slot.groupMode !== "random") return;

    // `group` is defined here: a random-pool slot can't be manual — pinning
    // item ids needs a known pool.
    if (slot.mode === "manual" && group) {
      const itemIds = slot.itemIds ?? [];
      const groupItemIds = new Set(group.items.map((item) => item.id));
      const pinned = pinnedByGroup.get(slot.groupId!) ?? new Set<string>();
      itemIds.forEach((id, ii) => {
        if (!groupItemIds.has(id)) {
          ctx.addIssue({
            code: "custom",
            path: ["rounds", ri, "slots", 0, "itemIds", ii],
            message: "Pick an item for every place.",
          });
        } else if (pinned.has(id)) {
          ctx.addIssue({
            code: "custom",
            path: ["rounds", ri, "slots", 0, "itemIds", ii],
            message: "This item is already placed in another round.",
          });
        } else {
          pinned.add(id);
        }
      });
      pinnedByGroup.set(slot.groupId!, pinned);
      if (itemIds.length < ELIMINATION_MIN_DRAW) {
        ctx.addIssue({
          code: "custom",
          path: ["rounds", ri, "slots", 0],
          message: `Each round must show at least ${ELIMINATION_MIN_DRAW} items.`,
        });
      } else if (itemIds.length > ELIMINATION_MAX_DRAW) {
        ctx.addIssue({
          code: "custom",
          path: ["rounds", ri, "slots", 0],
          message: `Each round must show at most ${ELIMINATION_MAX_DRAW} items.`,
        });
      }
      return;
    }

    const effective = slot.count ?? 0;
    if (effective < ELIMINATION_MIN_DRAW) {
      ctx.addIssue({
        code: "custom",
        path: ["rounds", ri, "slots", 0],
        message: `Each round must show at least ${ELIMINATION_MIN_DRAW} items.`,
      });
    } else if (effective > ELIMINATION_MAX_DRAW) {
      ctx.addIssue({
        code: "custom",
        path: ["rounds", ri, "slots", 0],
        message: `Each round must show at most ${ELIMINATION_MAX_DRAW} items.`,
      });
    }
  });

  if (groupsOk) validateFeasibility(pack, ctx);
}

// save_one_friends: save_one played live by 2–4 friends in a room. Every round
// is a SINGLE random slot with NO count and NO pinned items — the room shows one
// item per player plus one (the survivor), a size fixed only when the room
// fills. Because the count is fixed at play time, every pool must hold a full
// board (FRIENDS_ROUND_DRAW), and under-fill is FATAL here (unlike other formats
// where only a 0-draw round blocks): a friends round that can't seat the max is
// unplayable. Mirrors velanto-backend create-pack.dto.ts (friends branch +
// friends feasibility).
export function validateFriends(pack: PackDraft, ctx: z.RefinementCtx) {
  const groupsOk = validateGroupsAndRefs(pack, ctx);

  // Every pool — including one no slot names, since a random-pool slot is handed
  // a pool at play time — must be able to fill a full 4-player board plus the
  // survivor.
  pack.groups.forEach((group, gi) => {
    if (group.items.length < FRIENDS_ROUND_DRAW) {
      ctx.addIssue({
        code: "custom",
        path: ["groups", gi, "items"],
        message: `Each pool needs at least ${FRIENDS_ROUND_DRAW} items (one per player plus the survivor).`,
      });
    }
  });

  pack.rounds.forEach((round, ri) => {
    if (round.slots.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["rounds", ri, "slots"],
        message: "This round needs exactly one group.",
      });
      return;
    }
    const slot = round.slots[0];
    if (slot.mode !== "random") {
      ctx.addIssue({
        code: "custom",
        path: ["rounds", ri, "slots", 0, "mode"],
        message: "Friends rounds are drawn randomly.",
      });
    }
    // The room shows one item per player plus one, so an authored count or a
    // pinned item list is always wrong — rejected, not ignored, to match the API.
    if (slot.count !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["rounds", ri, "slots", 0, "count"],
        message:
          "Friends rounds don't take a size — the room shows one item per player plus one.",
      });
    }
    if (slot.itemIds !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["rounds", ri, "slots", 0, "itemIds"],
        message:
          "Friends rounds don't pin items — the room draws them when it fills.",
      });
    }
  });

  if (groupsOk) validateFriendsFeasibility(pack, ctx);
}

// Friends packs author no count, so hand the draw engine the size the room will
// use (FRIENDS_ROUND_DRAW) and require every round to reach it — items never
// repeat across rounds sharing a pool, so a shared pool caps how many full
// boards it can feed. Under-fill is fatal (see validateFriends).
function validateFriendsFeasibility(pack: PackDraft, ctx: z.RefinementCtx) {
  const drawRounds = pack.rounds.map((round) => ({
    ...round,
    slots: round.slots.map((slot) => ({ ...slot, count: FRIENDS_ROUND_DRAW })),
  }));
  const resolved = resolveRoundDraws(pack.groups, drawRounds);
  const groupIds = new Set(pack.groups.map((group) => group.id));
  resolved.forEach((round, ri) => {
    round.slots.forEach((slot, si) => {
      if (slot.mode !== "random") return;
      // A random-pool slot has no shared pool to be used up by; a dangling ref
      // was already reported by validateGroupsAndRefs.
      if (!slot.groupId || !groupIds.has(slot.groupId)) return;
      if (slot.drawnCount < FRIENDS_ROUND_DRAW) {
        ctx.addIssue({
          code: "custom",
          path: ["rounds", ri, "slots", si],
          message: `This round can only draw ${slot.drawnCount} of the ${FRIENDS_ROUND_DRAW} items a friends round needs — earlier rounds don't reuse items.`,
        });
      }
    });
  });
}

// nxn / 1v1: every round is its own 2-slot matchup, both sides drawn randomly.
// The two sides may be two different pools (a classic A-vs-B matchup) or the
// SAME pool (a single-pool matchup — the draw engine hands each side disjoint
// items, so the pool size caps how many rounds it can feed; the zero-draw
// feasibility check enforces that). Pairs may vary freely across rounds.
// Per-side draw counts come from NXN_SIDE_COUNT_MIN/MAX; 1v1 is locked to 1.
export function validateVersus(pack: PackDraft, ctx: z.RefinementCtx) {
  const groupsOk = validateGroupsAndRefs(pack, ctx);
  const isHeadToHead = pack.format === "1v1";
  const perSideMin = isHeadToHead ? 1 : NXN_SIDE_COUNT_MIN;
  const perSideMax = isHeadToHead ? 1 : NXN_SIDE_COUNT_MAX;

  pack.rounds.forEach((round, ri) => {
    if (round.slots.length !== 2) {
      ctx.addIssue({
        code: "custom",
        path: ["rounds", ri, "slots"],
        message: "Versus rounds need exactly two groups.",
      });
      return;
    }
    round.slots.forEach((slot, si) => {
      if (slot.mode !== "random") {
        ctx.addIssue({
          code: "custom",
          path: ["rounds", ri, "slots", si, "mode"],
          message: "Versus sides are drawn randomly.",
        });
        return;
      }
      const count = slot.count ?? 0;
      if (count < perSideMin || count > perSideMax) {
        ctx.addIssue({
          code: "custom",
          path: ["rounds", ri, "slots", si, "count"],
          message: isHeadToHead
            ? "1v1 shows exactly one item per side."
            : `Show ${NXN_SIDE_COUNT_MIN}–${NXN_SIDE_COUNT_MAX} items per side.`,
        });
      }
    });
  });

  if (groupsOk) validateFeasibility(pack, ctx);
}
