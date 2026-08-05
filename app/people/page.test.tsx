import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import messages from "@/messages/en.json";
import PeoplePage, { generateMetadata } from "./page";

// PageHeader carries the account controls now, and they call useAuth, which
// throws without a provider. These screens are auth-agnostic, so they get a
// signed-out stub rather than a real AuthProvider (which would fire an
// on-mount refresh request none of these tests want to make).
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ user: null, status: "unauthenticated", logout: vi.fn() }),
}));

// PeopleFeed is a client island with its own tests (search + follow). Stub it so
// this test only asserts the route mounts it and frames it with a heading.
vi.mock("@/src/features/home/PeopleFeed", () => ({
  PeopleFeed: () => <div>PeopleFeed island</div>,
}));

// The route resolves two namespaces ("people" for its own copy, "header" for
// the shared back-to-browse label), so the mock dispatches by namespace —
// same shape as app/my-packs/page.test.tsx.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: string) => {
    const dict = (messages as Record<string, unknown>)[namespace] as Record<
      string,
      string
    >;
    return (key: string) => dict[key] ?? key;
  }),
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
