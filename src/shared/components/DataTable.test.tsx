import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DataTable, DataTableRow } from "./DataTable";

const COLUMNS = "1fr 100px";

function renderTable(children: React.ReactNode, isEmpty = false) {
  return render(
    <DataTable
      columns={COLUMNS}
      headers={["Name", "Count"]}
      empty="Nothing here"
      isEmpty={isEmpty}
    >
      {children}
    </DataTable>,
  );
}

describe("DataTable", () => {
  it("exposes each row child as a cell", () => {
    renderTable(
      <DataTableRow columns={COLUMNS}>
        <span>Ada</span>
        <span>7</span>
      </DataTableRow>,
    );

    // A role="row" whose children are bare spans has no cells at all, which is
    // what assistive tech would announce: an empty row.
    const rows = screen.getAllByRole("row");
    const bodyRow = rows[rows.length - 1];
    const cells = within(bodyRow).getAllByRole("cell");

    expect(cells).toHaveLength(2);
    expect(cells[0]).toHaveTextContent("Ada");
    expect(cells[1]).toHaveTextContent("7");
  });

  it("skips cells for children that render nothing", () => {
    const show = false;
    renderTable(
      <DataTableRow columns={COLUMNS}>
        <span>Ada</span>
        {show && <span>hidden</span>}
      </DataTableRow>,
    );

    const rows = screen.getAllByRole("row");
    const bodyRow = rows[rows.length - 1];

    // A conditional that renders nothing must not leave an empty cell behind —
    // that would desync the cells from the grid's column tracks.
    expect(within(bodyRow).getAllByRole("cell")).toHaveLength(1);
  });

  it("keeps each cell as a direct grid child so the column tracks still apply", () => {
    renderTable(
      <DataTableRow columns={COLUMNS}>
        <span>Ada</span>
        <span>7</span>
      </DataTableRow>,
    );

    const rows = screen.getAllByRole("row");
    const bodyRow = rows[rows.length - 1];
    const cells = within(bodyRow).getAllByRole("cell");

    // The row IS the grid; a cell that isn't a direct child would not be placed
    // in a column track.
    for (const cell of cells) expect(cell.parentElement).toBe(bodyRow);
  });

  it("renders the empty state inside a row/cell rather than loose in the table", () => {
    renderTable(null, true);

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    // Loose text inside role="table" belongs to no row — wrap it.
    const cell = screen.getByRole("cell");
    expect(cell).toHaveTextContent("Nothing here");
    expect(cell.closest('[role="row"]')).not.toBeNull();
  });

  it("still exposes the headers as column headers", () => {
    renderTable(
      <DataTableRow columns={COLUMNS}>
        <span>Ada</span>
        <span>7</span>
      </DataTableRow>,
    );

    expect(
      screen.getAllByRole("columnheader").map((h) => h.textContent),
    ).toEqual(["Name", "Count"]);
  });
});
