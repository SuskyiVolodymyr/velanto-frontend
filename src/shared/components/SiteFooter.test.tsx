import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("shows the tagline and the current year in the copyright", () => {
    render(<SiteFooter />);
    expect(
      screen.getByText(/Build elimination-quiz packs/),
    ).toBeInTheDocument();
    // The year is computed at render time, so assert against it rather than a
    // hardcoded value (which would rot every January).
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(`${year} Velanto`))).toBeInTheDocument();
  });

  it("links to the key pages, reusing header labels", () => {
    render(<SiteFooter />);
    const links = Object.fromEntries(
      screen
        .getAllByRole("link")
        .map((a) => [a.getAttribute("href"), a.textContent]),
    );
    expect(links["/feedback"]).toBe("Feedback & suggestions");
    expect(links["/rules"]).toBe("Rules");
    expect(links["/docs"]).toBe("Docs");
    expect(links["/privacy"]).toBe("Privacy");
    expect(links["/terms"]).toBe("Terms");
  });
});
