import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:3001";

const MOCK_USER = {
  id: "u1",
  email: "alice@example.com",
  username: "alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

// The play page loads its pack in a Server Component (getPackServer), whose
// fetch originates from the Next server process — page.route only sees
// browser-issued requests, so it can't intercept it. The shared mock backend on
// :3001 (e2e/mock-backend.ts, started by global-setup) serves those server-side
// GET /packs/:id calls (fixtures pack-save / pack-sacrifice / pack-nxn).
// Browser-issued calls (/auth/refresh, POST plays) are handled by page.route
// below.

test.describe("Play a pack", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticated session so the login gate never shows.
    await page.route(`${API_BASE}/auth/refresh`, (route) =>
      route.fulfill({
        status: 201,
        json: { accessToken: "access-token", user: MOCK_USER },
      }),
    );
  });

  for (const format of ["pack-save", "pack-sacrifice"] as const) {
    test(`plays a full groups session (${format}) with confirm-gating and records the picks`, async ({
      page,
    }) => {
      let recordBody: unknown;
      await page.route(`${API_BASE}/packs/${format}/plays`, (route) => {
        recordBody = route.request().postDataJSON();
        return route.fulfill({ status: 201, json: { id: "play-1" } });
      });

      await page.goto(`/packs/${format}/play`);

      // Round 1: all candidates shown at once; gated until something is selected.
      await expect(page.getByRole("heading", { name: "2016" })).toBeVisible();
      await expect(page.getByText("Round 1 of 2")).toBeVisible();
      await expect(page.getByRole("button", { name: "Show all" })).toHaveCount(
        0,
      );
      await expect(
        page.getByRole("button", { name: "Next round →" }),
      ).toBeDisabled();

      await page.getByText("Guren no Yumiya").click();
      await expect(
        page.getByRole("button", { name: "Next round →" }),
      ).toBeEnabled();
      await page.getByRole("button", { name: "Next round →" }).click();

      // Round 2 (the last round): single item, still gated on selection; the
      // confirm button reads "see results" now.
      await expect(page.getByRole("heading", { name: "2020" })).toBeVisible();
      await expect(page.getByText("Round 2 of 2")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "See results →" }),
      ).toBeDisabled();
      await page.getByText("Silhouette").click();
      await page.getByRole("button", { name: "See results →" }).click();

      // Finishing records the play (then it navigates straight to the result
      // page — no interstitial "all rounds done" screen; that redirect is
      // covered by the PlayScreen unit tests).
      await expect
        .poll(() => recordBody)
        .toEqual({
          picks: [
            { roundIndex: 0, groupId: "g1", itemId: "1" },
            { roundIndex: 1, groupId: "g2", itemId: "3" },
          ],
        });
    });
  }

  test("lets a signed-out visitor play a pack without recording it", async ({
    page,
  }) => {
    // Override the beforeEach's authenticated session with a signed-out one.
    await page.route(`${API_BASE}/auth/refresh`, (route) =>
      route.fulfill({ status: 401, json: { message: "Unauthorized" } }),
    );
    let recorded = false;
    await page.route(`${API_BASE}/packs/pack-save/plays`, (route) => {
      recorded = true;
      return route.fulfill({ status: 201, json: { id: "play-1" } });
    });

    await page.goto("/packs/pack-save/play");

    // No login wall — anon can play the whole session.
    await expect(page.getByRole("heading", { name: "2016" })).toBeVisible();
    await page.getByText("Guren no Yumiya").click();
    await page.getByRole("button", { name: "Next round →" }).click();
    await expect(page.getByRole("heading", { name: "2020" })).toBeVisible();
    await page.getByText("Silhouette").click();
    await page.getByRole("button", { name: "See results →" }).click();

    // It reaches the result page…
    await expect(page).toHaveURL(/\/packs\/pack-save\/result/);
    // …without ever recording the play on the backend.
    expect(recorded).toBe(false);
  });

  test("renders image-item candidates with the title as alt text during play", async ({
    page,
  }) => {
    await page.goto("/packs/pack-image/play");

    await expect(page.getByRole("heading", { name: "Posters" })).toBeVisible();
    // Each image item renders as an <img> with its title as accessible name.
    await expect(page.getByRole("img", { name: "Poster A" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Poster B" })).toBeVisible();

    // The whole image card is selectable (single round → confirm reads results).
    await page.getByRole("button", { name: "Pick Poster A" }).click();
    await expect(
      page.getByRole("button", { name: "See results →" }),
    ).toBeEnabled();
  });

  test("plays a full nxn session with confirm-gating and records the side picks", async ({
    page,
  }) => {
    let recordBody: unknown;
    await page.route(`${API_BASE}/packs/pack-nxn/plays`, (route) => {
      recordBody = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { id: "play-1" } });
    });

    await page.goto("/packs/pack-nxn/play");

    // Round 1: two sides with a VS divider, gated until a side is picked.
    await expect(page.getByRole("button", { name: "Pick Boys" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Pick Girls" }),
    ).toBeVisible();
    await expect(page.getByText("VS")).toBeVisible();
    await expect(page.getByRole("button", { name: "Show all" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Next round →" }),
    ).toBeDisabled();

    await page.getByRole("button", { name: "Pick Boys" }).click();
    await expect(
      page.getByRole("button", { name: "Next round →" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Next round →" }).click();

    // Round 2.
    await expect(page.getByText("Round 2 of 2")).toBeVisible();
    await page.getByRole("button", { name: "Pick Girls" }).click();
    await page.getByRole("button", { name: "See results →" }).click();

    // Finishing records the play, then navigates straight to the result page
    // (redirect covered by the PlayScreen unit tests).
    await expect
      .poll(() => recordBody)
      .toEqual({
        picks: [
          { roundIndex: 0, groupId: "ca" },
          { roundIndex: 1, groupId: "cb" },
        ],
      });
  });
});
