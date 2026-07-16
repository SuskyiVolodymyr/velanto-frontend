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

  // The support address is the only contact route on the platform, and both
  // legal documents point at it — so it needs to be reachable from any page,
  // not only from inside those documents.
  it("offers the support address as a mailto link", () => {
    render(<SiteFooter />);
    const contact = screen.getByRole("link", {
      name: "support@playvelanto.com",
    });
    expect(contact).toHaveAttribute("href", "mailto:support@playvelanto.com");
  });
});
