import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegalScreen } from "./LegalScreen";

describe("LegalScreen", () => {
  const props = {
    heading: "Terms of Service",
    intro: "These Terms govern your use of Velanto.",
    lastUpdatedLabel: "Last updated",
    lastUpdated: "2026-07-15",
    sections: [
      {
        title: "Acceptance",
        body: "By using Velanto you agree to these Terms.",
      },
      { title: "Contact", body: "Reach us at admin@playvelanto.com." },
    ],
  };

  it("renders the heading, intro, and the last-updated date", () => {
    render(<LegalScreen {...props} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Terms of Service" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("These Terms govern your use of Velanto."),
    ).toBeInTheDocument();
    expect(screen.getByText("Last updated: 2026-07-15")).toBeInTheDocument();
  });

  it("renders every section as a subheading with its body", () => {
    render(<LegalScreen {...props} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Acceptance" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("By using Velanto you agree to these Terms."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Contact" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Reach us at admin@playvelanto.com."),
    ).toBeInTheDocument();
  });
});
