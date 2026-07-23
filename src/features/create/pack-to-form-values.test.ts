import { describe, expect, it } from "vitest";
import { packToFormValues } from "@/src/features/create/pack-to-form-values";
import type { Pack } from "@/src/shared/types/pack";

const PACK: Pack = {
  id: "pack-1",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  format: "save_one",
  language: "en",
  tags: ["Anime", "Music"],
  groups: [
    {
      id: "g1",
      name: "2016",
      items: [{ id: "i1", type: "text", title: "AoT", value: "Guren" }],
    },
  ],
  rounds: [
    { id: "r1", name: "Round 1", slots: [{ groupId: "g1", mode: "manual" }] },
  ],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

describe("packToFormValues", () => {
  it("maps the editable pack fields onto create-form values", () => {
    expect(packToFormValues(PACK)).toEqual({
      title: "Best Anime Openings",
      description: "Pick your favorite each round.",
      coverTone: "#2b2a3a",
      format: "save_one",
      language: "en",
      tags: ["Anime", "Music"],
      groups: PACK.groups,
      rounds: PACK.rounds,
    });
  });

  it("seeds an existing cover image key", () => {
    expect(
      packToFormValues({ ...PACK, coverImageKey: "media/cover/x.webp" })
        ?.coverImageKey,
    ).toBe("media/cover/x.webp");
  });

  it("maps a null cover (gradient-only pack) to undefined so the optional field stays valid", () => {
    expect(
      packToFormValues({ ...PACK, coverImageKey: null })?.coverImageKey,
    ).toBeUndefined();
  });

  it("drops server-only fields (id, authorId, status, stats) that the form doesn't own", () => {
    const values = packToFormValues(PACK);
    expect(values).not.toHaveProperty("id");
    expect(values).not.toHaveProperty("authorId");
    expect(values).not.toHaveProperty("status");
    expect(values).not.toHaveProperty("likes");
  });

  // #355: a random-pool slot has no groupId, and the edit form must not invent
  // one — re-saving would silently pin a pool the author never chose.
  it("round-trips a random-pool slot untouched", () => {
    const values = packToFormValues({
      ...PACK,
      rounds: [
        {
          id: "r1",
          slots: [{ groupMode: "random", mode: "random", count: 2 }],
        },
      ],
    });

    expect(values?.rounds[0].slots[0]).toEqual({
      groupMode: "random",
      mode: "random",
      count: 2,
    });
  });

  // save_one_friends is a first-class editable format now — its rounds are
  // single-slot random draws with no count, which the friends editor renders.
  it("seeds the form for a save_one_friends pack", () => {
    const friendsPack: Pack = {
      ...PACK,
      format: "save_one_friends",
      rounds: [{ id: "r1", slots: [{ groupId: "g1", mode: "random" }] }],
    };
    const values = packToFormValues(friendsPack);

    expect(values).not.toBeNull();
    expect(values?.format).toBe("save_one_friends");
    expect(values?.rounds).toEqual(friendsPack.rounds);
  });

  // The null path is the defensive guard for a genuinely unknown wire format (a
  // backend deployed ahead of this build), NOT for any shipped format.
  it("returns null for a format this build does not know", () => {
    expect(
      packToFormValues({
        ...PACK,
        format: "telepathy" as Pack["format"],
      }),
    ).toBeNull();
  });
});
