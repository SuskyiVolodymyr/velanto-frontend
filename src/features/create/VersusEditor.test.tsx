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
});
