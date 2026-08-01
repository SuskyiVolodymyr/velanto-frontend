import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PriorityHolderBadge } from "./PriorityHolderBadge";

describe("PriorityHolderBadge", () => {
  it("names the priority holder and explains what it means", () => {
    render(<PriorityHolderBadge username="Alice" />);
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/breaks ties/i)).toBeInTheDocument();
  });
});
