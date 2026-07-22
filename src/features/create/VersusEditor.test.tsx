import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
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

function baseValues(format: PackFormat, perSide: number): CreatePackValues {
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
    ],
    rounds: versusRounds("boys", "girls", 2, perSide),
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
}: {
  format?: PackFormat;
  perSide?: number;
}) {
  const methods = useForm<CreatePackValues>({
    defaultValues: baseValues(format, perSide),
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

describe("VersusEditor", () => {
  it("renders a matchup per round with both side selects", () => {
    render(<Harness format="nxn" perSide={2} />);

    expect(screen.getByLabelText("Side A for round 1")).toHaveValue("boys");
    expect(screen.getByLabelText("Side B for round 1")).toHaveValue("girls");
    expect(screen.getByLabelText("Side A for round 2")).toHaveValue("boys");
    expect(screen.getByLabelText("Items per side for round 1")).toHaveValue(2);
  });

  it("changes only the edited round's side", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={1} />);

    await user.selectOptions(
      screen.getByLabelText("Side B for round 1"),
      "boys",
    );

    const rounds = readRounds();
    expect(rounds[0].b).toBe("boys");
    expect(rounds[1].b).toBe("girls"); // round 2 untouched
  });

  it("allows the same pool on both sides and shows the single-pool note", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={1} />);

    await user.selectOptions(
      screen.getByLabelText("Side B for round 1"),
      "boys",
    );

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

    await user.click(screen.getByRole("button", { name: "+ Add round" }));

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
    it("offers Random pool first, counting the pools still free", () => {
      render(<Harness format="nxn" perSide={2} />);

      const sideA = screen.getByLabelText("Side A for round 1");
      const [first] = Array.from(sideA.querySelectorAll("option"));
      // Both pools are pinned across the two rounds, so none are free.
      expect(first).toHaveTextContent("Random pool (0 available)");
      expect(first).toHaveValue("__random__");
    });

    it("counts the other side of the same round against what is free", async () => {
      const user = userEvent.setup();
      render(<Harness format="nxn" perSide={2} />);

      // Free both pools by making side A of each round random…
      await user.selectOptions(
        screen.getByLabelText("Side A for round 1"),
        "__random__",
      );
      await user.selectOptions(
        screen.getByLabelText("Side A for round 2"),
        "__random__",
      );
      // …now side B of round 1 sees: 2 pools, 1 still pinned (round 2's B),
      // minus the 2 random slots already declared.
      const optionB = screen
        .getByLabelText("Side B for round 1")
        .querySelector("option")!;
      expect(optionB).toHaveTextContent("Random pool (0 available)");
    });

    it("replaces the slot rather than leaving a stale group id beside it", async () => {
      const user = userEvent.setup();
      render(<Harness format="nxn" perSide={2} />);

      await user.selectOptions(
        screen.getByLabelText("Side A for round 1"),
        "__random__",
      );

      const [round1] = readRounds();
      expect(round1.a).toBeUndefined();
      expect(round1.ma).toBe("random");
      // The per-side draw count survives the switch.
      expect(round1.ca).toBe(2);
    });

    it("goes back to a named pool cleanly", async () => {
      const user = userEvent.setup();
      render(<Harness format="nxn" perSide={2} />);
      const sideA = screen.getByLabelText("Side A for round 1");

      await user.selectOptions(sideA, "__random__");
      await user.selectOptions(sideA, "girls");

      const [round1] = readRounds();
      expect(round1.a).toBe("girls");
      expect(round1.ma).toBeUndefined();
    });
  });
});
