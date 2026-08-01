import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { CreateChecklistPanel } from "./CreateChecklistPanel";
import type { CreatePackValues } from "./create-pack.schema";

// One empty pool, title/description blank, no cover — every row false except
// "Format chosen" (which is always true once a format is selected, and one
// always is by the time this panel renders).
const EMPTY_VALUES: CreatePackValues = {
  title: "",
  description: "",
  coverTone: "#2b2a3a",
  format: "save_one",
  language: "en",
  tags: [],
  groups: [{ id: "g1", name: "Pool", items: [] }],
  rounds: [
    {
      id: "r1",
      name: "",
      slots: [{ groupId: "g1", mode: "random", count: 2 }],
    },
  ],
};

// Title filled, two pools (one with items, one empty), a non-default cover
// tone — every row true.
const SEEDED_VALUES: CreatePackValues = {
  title: "Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#20303a",
  format: "save_one",
  language: "en",
  tags: [],
  groups: [
    {
      id: "g1",
      name: "2016",
      items: [
        { id: "i1", type: "text", title: "A", value: "A" },
        { id: "i2", type: "text", title: "B", value: "B" },
      ],
    },
    { id: "g2", name: "2017", items: [] },
  ],
  rounds: [
    {
      id: "r1",
      name: "",
      slots: [{ groupId: "g1", mode: "manual", itemIds: ["i1", "i2"] }],
    },
  ],
};

describe("CreateChecklistPanel", () => {
  it("marks only Format chosen as done for a blank, coverless draft", () => {
    render(<CreateChecklistPanel values={EMPTY_VALUES} />);

    expect(screen.getByText("Format chosen")).toBeInTheDocument();
    expect(screen.getByText("Title written")).toBeInTheDocument();
    expect(screen.getByText("0 pools with items")).toBeInTheDocument();
    expect(screen.getByText("Cover image")).toBeInTheDocument();

    const rows = screen.getAllByText(/^(Done|Not done yet)$/, {
      selector: "span",
    });
    expect(rows.map((row) => row.textContent)).toEqual([
      "Done",
      "Not done yet",
      "Not done yet",
      "Not done yet",
    ]);
  });

  it("marks every row done once title, a stocked pool, and a chosen cover tone are all set", () => {
    render(<CreateChecklistPanel values={SEEDED_VALUES} />);

    expect(screen.getByText("1 pool with items")).toBeInTheDocument();
    const rows = screen.getAllByText(/^(Done|Not done yet)$/, {
      selector: "span",
    });
    expect(rows.every((row) => row.textContent === "Done")).toBe(true);
  });

  it("treats a real cover image key as a cover even at the default tone", () => {
    render(
      <CreateChecklistPanel
        values={{
          ...EMPTY_VALUES,
          coverImageKey: "media/cover/abc.webp",
        }}
      />,
    );

    const coverRow = screen.getByText("Cover image").closest("li");
    expect(coverRow).toHaveTextContent("Done");
  });

  it("does not render the feasibility/friend-modes panel", () => {
    render(<CreateChecklistPanel values={EMPTY_VALUES} />);

    expect(screen.queryByText(/friend modes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/scored/i)).not.toBeInTheDocument();
  });
});
