import type { Pack, PackOverview } from "@/types/pack";

/**
 * Turn a full `Pack` fixture into the `PackOverview` the pack page actually
 * receives — so a test can keep declaring one readable pack and still render
 * the components that take the trimmed shape.
 *
 * The round summaries here are a stand-in, not a reimplementation: the real
 * `itemsCount` comes from the API's shared draw engine (a random slot's size
 * depends on what manual slots reserved out of the pool), and that engine has
 * its own tests on the backend. What matters to a component test is the SHAPE.
 */
export function toOverview(pack: Pack): PackOverview {
  const { groups, rounds, ...rest } = pack;
  const nameByGroupId = new Map(groups.map((g) => [g.id, g.name]));

  return {
    ...rest,
    rounds: rounds.map((round) => {
      const soleSlot = round.slots.length === 1 ? round.slots[0] : undefined;
      return {
        id: round.id,
        name: round.name?.trim() || null,
        poolName:
          soleSlot?.groupId !== undefined
            ? (nameByGroupId.get(soleSlot.groupId) ?? null)
            : null,
        randomPool: soleSlot?.groupMode === "random",
        itemsCount: round.slots.reduce(
          (sum, slot) => sum + (slot.itemIds?.length ?? slot.count ?? 0),
          0,
        ),
      };
    }),
  };
}
