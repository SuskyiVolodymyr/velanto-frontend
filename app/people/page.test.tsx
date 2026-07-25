import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import messages from "@/messages/en.json";
import PeoplePage, { generateMetadata } from "./page";

// PeopleFeed is a client island with its own tests (search + follow). Stub it so
// this test only asserts the route mounts it and frames it with a heading.
vi.mock("@/src/features/home/PeopleFeed", () => ({
  PeopleFeed: () => <div>PeopleFeed island</div>,
}));

// getTranslations needs a request context we don't have in a unit test; back it
// with the real English catalog so the page reads the shipped copy.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(
    async () => (key: string) =>
      (messages.people as Record<string, string>)[key] ?? key,
  ),
}));

describe("/people route", () => {
  it("renders the People heading and the PeopleFeed island", async () => {
    render(await PeoplePage());

    expect(
      screen.getByRole("heading", { level: 1, name: "People" }),
    ).toBeInTheDocument();
    expect(screen.getByText("PeopleFeed island")).toBeInTheDocument();
  });

  it("is indexable with an absolute title and canonical URL", async () => {
    const meta = await generateMetadata();

    expect(meta.title).toEqual({ absolute: "People — Velanto" });
    expect(meta.alternates?.canonical).toMatch(/\/people$/);
    // Public, discoverable page — no noindex.
    expect(meta.robots).toBeUndefined();
  });
});
