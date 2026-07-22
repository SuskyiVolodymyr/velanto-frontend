import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RankedList } from "./RankedList";

describe("RankedList", () => {
  it("numbers the rows by their place in the list, not by any id", () => {
    render(
      <RankedList
        rows={[
          { id: "i9", title: "Redo" },
          { id: "i1", title: "Kaikai Kitan" },
        ]}
      />,
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("1");
    expect(rows[0]).toHaveTextContent("Redo");
    expect(rows[1]).toHaveTextContent("2");
    expect(rows[1]).toHaveTextContent("Kaikai Kitan");
  });

  it("marks where each row came in the draw", () => {
    render(
      <RankedList
        rows={[
          // Shown second, ranked first — the pairing the marker exists for.
          { id: "i2", title: "Redo", drawIndex: 1 },
          { id: "i1", title: "Kaikai Kitan", drawIndex: 0 },
        ]}
      />,
    );

    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Shown #2");
    expect(screen.getAllByRole("listitem")[1]).toHaveTextContent("Shown #1");
  });

  // Plays recorded before #338 never stored a draw order, so there is nothing
  // to show — a "Shown #1" invented from list order would be a lie.
  it("says nothing about the draw when a row has no draw index", () => {
    render(<RankedList rows={[{ id: "i1", title: "Kaikai Kitan" }]} />);

    expect(screen.queryByText(/Shown #/)).toBeNull();
  });
});
