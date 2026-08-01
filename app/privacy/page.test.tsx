import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import messages from "@/messages/en.json";
import PrivacyPage, { generateMetadata } from "./page";

// See app/terms/page.test.tsx for why this mock dispatches by namespace.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: string) => {
    const dict = (messages as Record<string, unknown>)[
      namespace
    ] as Record<string, unknown>;
    const t = (key: string) => {
      const value = dict[key];
      return typeof value === "string" ? value : key;
    };
    t.raw = (key: string) => dict[key];
    return t;
  }),
}));

describe("/privacy route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Privacy document with the Privacy tab active", async () => {
    render(await PrivacyPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Terms" })).not.toHaveAttribute(
      "aria-current",
    );
    // The existing Contact section's real body copy is unchanged.
    expect(
      screen.getByText(
        "Anything in this policy, including every right listed above: support@playvelanto.com. One person reads that inbox, and they wrote this page.",
      ),
    ).toBeInTheDocument();
  });

  it("sets an absolute title, description, and canonical", async () => {
    const meta = await generateMetadata();

    expect(meta.title).toEqual({ absolute: "Privacy Policy — Velanto" });
    expect(meta.description).toBe(messages.privacy.metaDescription);
    expect(meta.alternates?.canonical).toMatch(/\/privacy$/);
  });
});
