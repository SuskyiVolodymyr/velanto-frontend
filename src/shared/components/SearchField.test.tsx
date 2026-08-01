import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchField } from "./SearchField";

describe("SearchField", () => {
  it("renders a search input that accepts typing", async () => {
    const user = userEvent.setup();
    render(<SearchField aria-label="Search packs" placeholder="Search…" />);

    const input = screen.getByRole("searchbox", { name: "Search packs" });
    await user.type(input, "anime");

    expect(input).toHaveValue("anime");
  });

  it("shows the '/' key hint only when requested", () => {
    const { rerender } = render(<SearchField aria-label="Search" />);
    expect(screen.queryByText("/")).not.toBeInTheDocument();

    rerender(<SearchField aria-label="Search" showKeyHint />);
    expect(screen.getByText("/")).toBeInTheDocument();
  });
});
