import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title, description and action", () => {
    render(
      <EmptyState
        title="No packs yet"
        description="Try a different filter."
        action={
          <button type="button" onClick={() => {}}>
            Clear filters
          </button>
        }
      />,
    );
    expect(screen.getByText("No packs yet")).toBeInTheDocument();
    expect(screen.getByText("Try a different filter.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear filters" }),
    ).toBeInTheDocument();
  });

  it("renders with only a title (optional parts omitted)", () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
  });
});
