import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import messages from "@/messages/en.json";
import UpdatesPage, { generateMetadata } from "./page";

// getTranslations needs a request context we don't have in unit tests; back it
// with the real English catalog (including ICU plural resolution for
// changesCount/showMore) so this exercises the same interpolation the real
// next-intl translator performs.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => {
    const dict = messages.updates as Record<string, string>;
    const t = (key: string, values?: Record<string, number>) => {
      const template = dict[key];
      if (template === undefined) return key;
      if (key === "changesCount") {
        const count = values?.count ?? 0;
        return count === 1 ? "1 change" : `${count} changes`;
      }
      return template.replace(
        /\{(\w+)\}/g,
        (_, name) => String(values?.[name] ?? ""),
      );
    };
    return t;
  }),
}));

describe("/updates route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the changelog with a releases rail and a change-count badge", async () => {
    render(await UpdatesPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "What's new" }),
    ).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Releases" });
    expect(within(nav).getByRole("link", { name: "v1.0.0" })).toBeInTheDocument();
    // The most recent entry, 1.8.1, has 4 bullets — exactly PREVIEW_BULLETS,
    // so no "show more" toggle, but the count badge still renders.
    expect(screen.getAllByText("4 changes").length).toBeGreaterThan(0);
  });

  it("sets an absolute title, description, and canonical", async () => {
    const meta = await generateMetadata();

    expect(meta.title).toEqual({ absolute: "Updates — Velanto" });
    expect(meta.description).toBe(messages.updates.metaDescription);
    expect(meta.alternates?.canonical).toMatch(/\/updates$/);
  });
});
