import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { LegalScreen } from "./LegalScreen";

describe("LegalScreen", () => {
  const props = {
    activeDoc: "terms" as const,
    heading: "Terms of Service",
    intro: "These Terms govern your use of Velanto.",
    lastUpdatedLabel: "Last updated",
    lastUpdated: "2026-07-15",
    termsTabLabel: "Terms",
    privacyTabLabel: "Privacy",
    onThisPageLabel: "On this page",
    questionsTitle: "Questions about this document?",
    questionsNote: "One person reads that inbox, and answers within 30 days.",
    sections: [
      {
        title: "Acceptance",
        body: "By using Velanto you agree to these Terms.",
      },
      { title: "Contact", body: "Reach us at support@playvelanto.com." },
    ],
  };

  const withBullets = {
    ...props,
    sections: [
      {
        title: "How long we keep things",
        body: "Each kind of data has its own period:",
        bullets: [
          "Your account: until you delete it.",
          "Comments: kept, detached from your name.",
        ],
      },
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
    expect(screen.getByText(/Last updated/)).toHaveTextContent(
      "Last updated: 2026-07-15",
    );
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
      screen.getByText("Reach us at support@playvelanto.com."),
    ).toBeInTheDocument();
  });

  // Retention has to be stated per data category, and the notice must be
  // readable by a 16-year-old (GDPR Art. 12(1)) — a prose blob fails both.
  it("renders a section's bullets as a list", () => {
    render(<LegalScreen {...withBullets} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "Your account: until you delete it.",
      "Comments: kept, detached from your name.",
    ]);
  });

  it("renders no list for a section without bullets", () => {
    render(<LegalScreen {...props} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders a Terms/Privacy toggle as two real links, marking the active document", () => {
    render(<LegalScreen {...props} />);
    const termsLink = screen.getByRole("link", { name: "Terms" });
    const privacyLink = screen.getByRole("link", { name: "Privacy" });
    expect(termsLink).toHaveAttribute("href", "/terms");
    expect(privacyLink).toHaveAttribute("href", "/privacy");
    expect(termsLink).toHaveAttribute("aria-current", "page");
    expect(privacyLink).not.toHaveAttribute("aria-current");
  });

  it("marks Privacy as the active document when activeDoc is 'privacy'", () => {
    render(<LegalScreen {...props} activeDoc="privacy" />);
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Terms" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("renders a sticky 'on this page' TOC with a jump-link per section", () => {
    render(<LegalScreen {...props} />);
    const nav = screen.getByRole("navigation", { name: "On this page" });
    const acceptanceLink = within(nav).getByRole("link", {
      name: "Acceptance",
    });
    const contactLink = within(nav).getByRole("link", { name: "Contact" });
    // Slugified from the section title, matching the mock's slug(): lowercase,
    // non-alnum runs collapsed to one hyphen, edges trimmed.
    expect(acceptanceLink.getAttribute("href")).toBe("#acceptance");
    expect(contactLink.getAttribute("href")).toBe("#contact");
    // The href targets a real element on the page.
    expect(
      document.getElementById(
        acceptanceLink.getAttribute("href")!.slice(1),
      ),
    ).toBeInTheDocument();
  });

  it("renders a 'questions about this document' contact card without removing the existing Contact section", () => {
    render(<LegalScreen {...props} />);
    // The card (new visual treatment) sits alongside the existing Contact
    // section — both must render, neither replaces the other.
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Questions about this document?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("One person reads that inbox, and answers within 30 days."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "support@playvelanto.com" }),
    ).toHaveAttribute("href", "mailto:support@playvelanto.com");
    // The pre-existing Contact section (real body copy) is still there too.
    expect(
      screen.getByRole("heading", { level: 2, name: "Contact" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Reach us at support@playvelanto.com."),
    ).toBeInTheDocument();
  });
});
