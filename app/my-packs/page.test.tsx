import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import messages from "@/messages/en.json";
import MyPacksPage, { generateMetadata } from "./page";

// MyPacksFeed is an auth-gated client island with its own tests. Stub it so this
// test only asserts the route mounts it and frames it with a heading.
vi.mock("@/src/features/home/MyPacksFeed", () => ({
  MyPacksFeed: () => <div>MyPacksFeed island</div>,
}));

// The route resolves two namespaces ("myPacks" for its own copy, "header" for
// the shared back-to-browse label), so the mock dispatches by namespace —
// see app/terms/page.test.tsx for the same pattern.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: string) => {
    const dict = (messages as Record<string, unknown>)[
      namespace
    ] as Record<string, string>;
    return (key: string) => dict[key] ?? key;
  }),
}));

describe("/my-packs route", () => {
  it("renders the My packs heading and the MyPacksFeed island", async () => {
    render(await MyPacksPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "My packs" }),
    ).toBeInTheDocument();
    expect(screen.getByText("MyPacksFeed island")).toBeInTheDocument();
  });

  it("is noindex — a private per-user view, not a landing page", async () => {
    const meta = await generateMetadata();

    expect(meta.title).toEqual({ absolute: "My packs — Velanto" });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("shows the shared page header with a back-to-browse link and the page name as its crumb", async () => {
    render(await MyPacksPage());

    const header = screen.getByRole("banner");
    expect(header).toHaveTextContent("My packs");
    expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
