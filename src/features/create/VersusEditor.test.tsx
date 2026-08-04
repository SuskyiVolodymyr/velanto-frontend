import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { pickFromDropdown } from "@/src/shared/test/pick-from-dropdown";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { VersusEditor } from "./VersusEditor";
import { versusRounds } from "./create-pack.defaults";
import type { CreatePackValues } from "./create-pack.schema";
import type { Item, PackFormat } from "@/src/shared/types/pack";

function items(n: number, prefix: string): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    type: "text" as const,
    title: `${prefix}${i}`,
    value: `${prefix}${i}`,
  }));
}

function baseValues(
  format: PackFormat,
  perSide: number,
  roundCount = 2,
  poolCount = 2,
): CreatePackValues {
  return {
    title: "",
    description: "",
    coverTone: "#2b2a3a",
    language: "en",
    format,
    tags: [],
    groups: [
      { id: "boys", name: "Boys", items: items(6, "boy") },
      { id: "girls", name: "Girls", items: items(6, "girl") },
      ...Array.from({ length: poolCount - 2 }, (_, i) => ({
        id: `p${i + 3}`,
        name: `Pool ${i + 3}`,
        items: items(6, `p${i + 3}`),
      })),
    ],
    rounds: versusRounds("boys", "girls", roundCount, perSide),
  };
}

function RoundsReadout() {
  const rounds = useWatch<CreatePackValues, "rounds">({ name: "rounds" });
  return (
    <div data-testid="rounds">
      {JSON.stringify(
        rounds.map((r) => ({
          a: r.slots[0]?.groupId,
          b: r.slots[1]?.groupId,
          ma: r.slots[0]?.groupMode,
          mb: r.slots[1]?.groupMode,
          ca: r.slots[0]?.count,
          cb: r.slots[1]?.count,
        })),
      )}
    </div>
  );
}

function Harness({
  format = "nxn",
  perSide = 1,
  rounds = 2,
  pools = 2,
}: {
  format?: PackFormat;
  perSide?: number;
  rounds?: number;
  pools?: number;
}) {
  const methods = useForm<CreatePackValues>({
    defaultValues: baseValues(format, perSide, rounds, pools),
  });
  return (
    <FormProvider {...methods}>
      <VersusEditor />
      <RoundsReadout />
    </FormProvider>
  );
}

function readRounds() {
  return JSON.parse(screen.getByTestId("rounds").textContent || "[]");
}

/**
 * The first option of a side's pool picker. The picker is the app's listbox
 * Dropdown, whose options exist only while it is open — so this opens it,
 * reads, and closes it again rather than querying the trigger's children.
 */
async function firstOptionOf(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
): Promise<HTMLElement> {
  await user.click(await screen.findByRole("combobox", { name: label }));
  const [first] = within(await screen.findByRole("listbox")).getAllByRole(
    "option",
  );
  await user.keyboard("{Escape}");
  return first;
}

describe("VersusEditor", () => {
  it("renders a matchup per round with both side selects", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={2} />);

    // T6: rounds render collapsed by default, one open at a time — round 1
    // starts expanded, round 2 needs its own header clicked open first.
    // The pool pickers are listboxes: their selected value shows as the
    // trigger's own text, not as a form value.
    expect(
      screen.getByRole("combobox", { name: "Side A for round 1" }),
    ).toHaveTextContent("Boys");
    expect(
      screen.getByRole("combobox", { name: "Side B for round 1" }),
    ).toHaveTextContent("Girls");
    expect(screen.getByLabelText("Items per side for round 1")).toHaveValue(2);

    await user.click(screen.getByRole("button", { name: /^Round 2/ }));
    expect(
      screen.getByRole("combobox", { name: "Side A for round 2" }),
    ).toHaveTextContent("Boys");
  });

  it("changes only the edited round's side", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={1} />);

    await pickFromDropdown(user, "Side B for round 1", "Boys");

    const rounds = readRounds();
    expect(rounds[0].b).toBe("boys");
    expect(rounds[1].b).toBe("girls"); // round 2 untouched
  });

  it("allows the same pool on both sides and shows the single-pool note", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={1} />);

    await pickFromDropdown(user, "Side B for round 1", "Boys");

    expect(readRounds()[0]).toMatchObject({ a: "boys", b: "boys" });
    expect(
      screen.getByText("Both sides use the same pool — items won't repeat."),
    ).toBeInTheDocument();
  });

  it("sets both slots' count when the per-side count changes", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={1} />);

    const input = screen.getByLabelText("Items per side for round 1");
    await user.clear(input);
    await user.type(input, "4");

    expect(readRounds()[0]).toMatchObject({ ca: 4, cb: 4 });
  });

  it("adds a matchup round", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={1} />);

    await user.click(screen.getByRole("button", { name: "New round" }));

    expect(readRounds()).toHaveLength(3);
  });

  it("removes a round", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={1} />);

    await user.click(screen.getByLabelText("Remove round 1"));

    expect(readRounds()).toHaveLength(1);
  });

  it("applies the bulk per-side count to every round", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={1} />);

    const bulk = screen.getByLabelText("Items per side, all rounds");
    // T4: the field now seeds itself from the live current per-side count, so
    // a replacement value is typed after clearing rather than into a blank.
    await user.clear(bulk);
    await user.type(bulk, "3");
    await user.click(screen.getByRole("button", { name: "Set for all" }));

    const rounds = readRounds();
    expect(
      rounds.every((r: { ca: number; cb: number }) => r.ca === 3 && r.cb === 3),
    ).toBe(true);
  });

  it("pins per-side to 1 with no input for 1v1", () => {
    render(<Harness format="1v1" perSide={1} />);

    expect(
      screen.queryByLabelText("Items per side for round 1"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("1 per side")).toBeInTheDocument();
  });

  // #355: a side can ask for a pool instead of naming one. The option's label
  // carries how many are still free, so the capacity rule reads as a countdown
  // in the dropdown rather than an error at submit.
  describe("random pool", () => {
    it("offers Random pool first, counting the pools still free", async () => {
      const user = userEvent.setup();
      render(<Harness format="nxn" perSide={2} />);

      // Both pools are pinned across the two rounds, so none are free.
      expect(await firstOptionOf(user, "Side A for round 1")).toHaveTextContent(
        "Random pool (0 available)",
      );
    });

    // #362: the count must fall the moment another side becomes random. The
    // version of this test it replaces used a 2-pool pack where the stale and
    // the correct number were both 0, so it passed against the bug — hence four
    // pools here, where the two differ.
    it("recounts as soon as another side becomes random", async () => {
      const user = userEvent.setup();
      render(<Harness format="nxn" perSide={2} rounds={1} pools={4} />);
      // 4 pools; side A pins "boys" and side B pins "girls". Side B excludes
      // itself, so it sees 4 - 1 pinned = 3.
      expect(await firstOptionOf(user, "Side B for round 1")).toHaveTextContent(
        "Random pool (3 available)",
      );

      await pickFromDropdown(user, "Side A for round 1", /^Random pool/);

      // Unchanged, and correctly so: side A released "boys" from the pinned set
      // and took a random pool instead, so what side B could be handed is the
      // same 3 pools. The number only moves when the pack's demand does.
      expect(await firstOptionOf(user, "Side B for round 1")).toHaveTextContent(
        "Random pool (3 available)",
      );

      await pickFromDropdown(user, "Side B for round 1", /^Random pool/);

      // Now nothing is pinned and two slots are random, so a third random slot
      // would have 2 pools to choose from.
      expect(await firstOptionOf(user, "Side A for round 1")).toHaveTextContent(
        "Random pool (3 available)",
      );
    });

    it("replaces the slot rather than leaving a stale group id beside it", async () => {
      const user = userEvent.setup();
      render(<Harness format="nxn" perSide={2} />);

      await pickFromDropdown(user, "Side A for round 1", /^Random pool/);

      const [round1] = readRounds();
      expect(round1.a).toBeUndefined();
      expect(round1.ma).toBe("random");
      // The per-side draw count survives the switch.
      expect(round1.ca).toBe(2);
    });

    it("goes back to a named pool cleanly", async () => {
      const user = userEvent.setup();
      render(<Harness format="nxn" perSide={2} />);
      await pickFromDropdown(user, "Side A for round 1", /^Random pool/);
      await pickFromDropdown(user, "Side A for round 1", "Girls");

      const [round1] = readRounds();
      expect(round1.a).toBe("girls");
      expect(round1.ma).toBeUndefined();
    });
  });
});

// T6: matchup rows collapse by default, same shape as RoundsEditor.
describe("VersusEditor progressive disclosure (T6)", () => {
  it("starts with the first round expanded and the rest collapsed", () => {
    render(<Harness format="nxn" perSide={1} rounds={2} />);

    expect(screen.getByLabelText("Side A for round 1")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Side A for round 2"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Round 2 Boys vs Girls/ }),
    ).toBeInTheDocument();
  });

  it("expands a collapsed round and collapses the previously-open one on click", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={1} rounds={2} />);

    await user.click(screen.getByRole("button", { name: /^Round 2/ }));

    expect(screen.getByLabelText("Side A for round 2")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Side A for round 1"),
    ).not.toBeInTheDocument();
  });

  it("auto-expands a newly added round", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={1} rounds={2} />);

    await user.click(screen.getByRole("button", { name: "New round" }));

    expect(screen.getByLabelText("Side A for round 3")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Side A for round 1"),
    ).not.toBeInTheDocument();
  });
});
