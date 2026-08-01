import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import messages from "@/messages/en.json";
import TermsPage, { generateMetadata } from "./page";

// getTranslations needs a request context we don't have in unit tests; back it
// with the real English catalog, keyed by namespace, so assertions read the
// shipped copy. TermsPage resolves two namespaces ("terms" for the document's
// own copy, "legal" for the shared doc-toggle/TOC/contact-card chrome), so the
// mock must dispatch by namespace rather than assuming a single one.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: string) => {
    const dict = (messages as Record<string, unknown>)[namespace] as Record<
      string,
      unknown
    >;
    const t = (key: string) => {
      const value = dict[key];
      return typeof value === "string" ? value : key;
    };
    t.raw = (key: string) => dict[key];
    return t;
  }),
}));

describe("/terms route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Terms document with the Terms tab active", async () => {
    render(await TermsPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Terms of Service" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Privacy" })).not.toHaveAttribute(
      "aria-current",
    );
    // The existing Contact section's real body copy is unchanged.
    expect(
      screen.getByText(
        "Questions about these Terms? Write to support@playvelanto.com.",
      ),
    ).toBeInTheDocument();
  });

  it("sets an absolute title, description, and canonical", async () => {
    const meta = await generateMetadata();

    expect(meta.title).toEqual({ absolute: "Terms of Service — Velanto" });
    expect(meta.description).toBe(messages.terms.metaDescription);
    expect(meta.alternates?.canonical).toMatch(/\/terms$/);
  });
});
