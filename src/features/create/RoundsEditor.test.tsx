import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { RoundsEditor } from "./RoundsEditor";
import type { CreatePackValues } from "./create-pack.schema";
import type { Item } from "@/src/shared/types/pack";

function items(n: number, prefix: string): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    type: "text" as const,
    title: `${prefix}${i}`,
    value: `${prefix}${i}`,
  }));
}

function baseValues(): CreatePackValues {
  return {
    title: "",
    description: "",
    coverTone: "#2b2a3a",
    format: "save_one",
    tags: [],
    groups: [
      { id: "a", name: "Pool A", items: items(3, "a") },
      { id: "b", name: "Pool B", items: items(2, "b") },
    ],
    rounds: [{ id: "r1", slots: [{ groupId: "a", mode: "random", count: 2 }] }],
  };
}

function RoundsReadout() {
  const rounds = useWatch<CreatePackValues, "rounds">({ name: "rounds" });
  return (
    <div data-testid="rounds">
      {JSON.stringify(
        rounds.map((r) => ({
          g: r.slots[0].groupId,
          m: r.slots[0].mode,
          c: r.slots[0].count,
        })),
      )}
    </div>
  );
}

function Harness({ initial }: { initial?: CreatePackValues }) {
  const methods = useForm<CreatePackValues>({
    defaultValues: initial ?? baseValues(),
  });
  return (
    <FormProvider {...methods}>
      <RoundsEditor />
      <RoundsReadout />
    </FormProvider>
  );
}

function readRounds() {
  return JSON.parse(screen.getByTestId("rounds").textContent || "[]");
}

describe("RoundsEditor", () => {
  it("renders a round with pool select, mode toggle, count input and a draw hint", () => {
    render(<Harness />);

    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Round 1 pool")).toBeInTheDocument();
    expect(screen.getByLabelText("Round 1 count")).toHaveValue(2);
    // Random draw of 2 from a 3-item pool → draws 2.
    expect(screen.getByText("Draws 2 items")).toBeInTheDocument();
  });

  it("shows a soft under-fill hint when the configured count exceeds what's left", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const count = screen.getByLabelText("Round 1 count");
    await user.clear(count);
    await user.type(count, "5");

    // Pool A has 3 items, so a random draw of 5 only shows 3.
    expect(screen.getByText("Draws 3 items")).toBeInTheDocument();
    expect(
      screen.getByText("Only 3 left — this round will show 3."),
    ).toBeInTheDocument();
  });

  it("hides the count input and draws the whole pool in manual mode", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText("Round 1 manual"));

    expect(screen.queryByLabelText("Round 1 count")).not.toBeInTheDocument();
    // Manual shows the whole 3-item pool.
    expect(screen.getByText("Draws 3 items")).toBeInTheDocument();
    expect(readRounds()[0].m).toBe("manual");
  });

  it("switches which pool a round draws from", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.selectOptions(screen.getByLabelText("Round 1 pool"), "b");

    expect(readRounds()[0].g).toBe("b");
  });

  it("appends a round drawing from the first pool", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "+ Add round" }));

    expect(screen.getByText("Round 2")).toBeInTheDocument();
    const rounds = readRounds();
    expect(rounds).toHaveLength(2);
    expect(rounds[1]).toMatchObject({ g: "a", m: "random", c: 2 });
  });

  it("removes a round", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "+ Add round" }));

    await user.click(screen.getByRole("button", { name: "Remove round 2" }));

    expect(screen.queryByText("Round 2")).not.toBeInTheDocument();
    expect(readRounds()).toHaveLength(1);
  });

  it("sets the count for every random round at once", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "+ Add round" }));

    const bulk = screen.getByLabelText("Set count for all rounds");
    await user.type(bulk, "3");
    await user.click(
      screen.getByRole("button", { name: "Set count for all rounds" }),
    );

    const rounds = readRounds();
    expect(rounds.every((r: { c: number }) => r.c === 3)).toBe(true);
  });
});
