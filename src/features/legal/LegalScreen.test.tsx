import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegalScreen } from "./LegalScreen";

describe("LegalScreen", () => {
  it("renders the heading, intro, and the draft notice", () => {
    render(
      <LegalScreen
        heading="Terms of Service"
        intro="These terms govern your use of Velanto."
        draftNotice="This is a working draft pending legal review."
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Terms of Service" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("These terms govern your use of Velanto."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This is a working draft pending legal review."),
    ).toBeInTheDocument();
  });
});
