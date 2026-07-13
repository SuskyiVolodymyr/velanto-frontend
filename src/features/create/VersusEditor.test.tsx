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
    format,
    tags: [],
    groups: [
      { id: "boys", name: "Boys", items: items(6, "boy") },
      { id: "girls", name: "Girls", items: items(6, "girl") },
    ],
    rounds: versusRounds("boys", "girls", 3, perSide),
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
          c: r.slots[0]?.count,
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
  it("derives its controls from the current rounds (nxn)", () => {
    render(<Harness format="nxn" perSide={2} />);

    expect(screen.getByLabelText("Side A")).toHaveValue("boys");
    expect(screen.getByLabelText("Side B")).toHaveValue("girls");
    expect(screen.getByLabelText("Rounds")).toHaveValue(3);
    expect(screen.getByLabelText("Items per side")).toHaveValue(2);
  });

  it("regenerates the rounds when the round count changes", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={1} />);

    const roundCount = screen.getByLabelText("Rounds");
    await user.clear(roundCount);
    await user.type(roundCount, "5");

    const rounds = readRounds();
    expect(rounds).toHaveLength(5);
    expect(
      rounds.every(
        (r: { a: string; b: string }) => r.a === "boys" && r.b === "girls",
      ),
    ).toBe(true);
  });

  it("regenerates the rounds when the per-side count changes (nxn)", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={1} />);

    const perSide = screen.getByLabelText("Items per side");
    await user.clear(perSide);
    await user.type(perSide, "4");

    const rounds = readRounds();
    expect(rounds).toHaveLength(3);
    expect(rounds.every((r: { c: number }) => r.c === 4)).toBe(true);
  });

  it("regenerates the rounds when a side changes", async () => {
    const user = userEvent.setup();
    render(<Harness format="nxn" perSide={1} />);

    await user.selectOptions(screen.getByLabelText("Side B"), "boys");

    expect(readRounds()[0].b).toBe("boys");
  });

  it("pins per-side to 1 with no input for 1v1", async () => {
    const user = userEvent.setup();
    render(<Harness format="1v1" perSide={1} />);

    expect(screen.queryByLabelText("Items per side")).not.toBeInTheDocument();
    expect(screen.getByText("1 per side")).toBeInTheDocument();

    // Changing the round count keeps every per-side count at 1.
    const roundCount = screen.getByLabelText("Rounds");
    await user.clear(roundCount);
    await user.type(roundCount, "4");

    const rounds = readRounds();
    expect(rounds).toHaveLength(4);
    expect(rounds.every((r: { c: number }) => r.c === 1)).toBe(true);
  });
});
