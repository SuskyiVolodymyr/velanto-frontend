import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:3001";

const MOCK_USER = {
  id: "u1",
  email: "alice@example.com",
  username: "alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

// Note: /packs/[id] fetches server-side (Next.js Server Component), which
// page.route cannot intercept (it only sees browser-issued requests). This
// spec only asserts the client-side create → redirect behavior, not the
// destination page's rendered content — that would need a live backend.
test.describe("Create pack", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_BASE}/auth/refresh`, (route) =>
      route.fulfill({
        status: 201,
        json: { accessToken: "access-token", user: MOCK_USER },
      }),
    );
  });

  // Capture the JSON body the client POSTs to /packs while fulfilling the
  // create request with a stub pack. Returns a getter for the captured payload.
  async function stubCreate(
    page: import("@playwright/test").Page,
    pack: Record<string, unknown>,
  ) {
    const captured: { body: Record<string, unknown> | null } = { body: null };
    await page.route(`${API_BASE}/packs`, (route) => {
      captured.body = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: pack });
    });
    return captured;
  }

  test("publishes a valid save_one pack and redirects with a groups+rounds payload", async ({
    page,
  }) => {
    const captured = await stubCreate(page, {
      id: "pack-1",
      title: "Best Anime Openings",
      description: "Pick your favorite each round.",
      coverTone: "#2b2a3a",
      format: "save_one",
      tags: [],
      groups: [],
      rounds: [],
      authorId: "u1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    await page.goto("/create");
    await page.getByLabel("Pack title").fill("Best Anime Openings");
    await page
      .getByLabel("Pack description")
      .fill("Pick your favorite each round.");
    // Default: one pool + one elimination round drawing 2 (under-fill of a
    // single-item pool is only a soft hint, so the pack is still valid).
    await page.getByLabel("Pool 1 name").fill("2016");
    await page.getByLabel("Pool 1 new item").fill("Guren no Yumiya");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: "Publish" }).click();

    await page.waitForURL("**/packs/pack-1");
    expect(captured.body).toMatchObject({ format: "save_one" });
    expect(captured.body?.groups).toBeDefined();
    expect(captured.body?.rounds).toBeDefined();
    expect(captured.body).not.toHaveProperty("categories");
    expect(captured.body).not.toHaveProperty("versusRounds");
  });

  test("publishes a valid sacrifice_one pack and redirects with a groups+rounds payload", async ({
    page,
  }) => {
    const captured = await stubCreate(page, {
      id: "pack-sac",
      title: "Worst Endings",
      description: "Cut them one by one.",
      coverTone: "#2b2a3a",
      format: "sacrifice_one",
      tags: [],
      groups: [],
      rounds: [],
      authorId: "u1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    await page.goto("/create");
    await page.getByRole("button", { name: /^Sacrifice One/ }).click();
    await page.getByLabel("Pack title").fill("Worst Endings");
    await page.getByLabel("Pack description").fill("Cut them one by one.");
    await page.getByLabel("Pool 1 name").fill("Finales");
    await page.getByLabel("Pool 1 new item").fill("Lost");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: "Publish" }).click();

    await page.waitForURL("**/packs/pack-sac");
    expect(captured.body).toMatchObject({ format: "sacrifice_one" });
    expect(captured.body?.rounds).toBeDefined();
    expect(captured.body).not.toHaveProperty("categories");
  });

  test("publishes a valid nxn pack from two pools with generated two-slot rounds", async ({
    page,
  }) => {
    const captured = await stubCreate(page, {
      id: "pack-nxn",
      title: "Boys vs Girls",
      description: "Pick a side.",
      coverTone: "#2b2a3a",
      format: "nxn",
      tags: [],
      groups: [],
      rounds: [],
      authorId: "u1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    await page.goto("/create");
    await page.getByLabel("Pack title").fill("Boys vs Girls");
    await page.getByLabel("Pack description").fill("Pick a side.");

    // Two distinct pools, each with one item, built before switching so the
    // versus format generates rounds over both.
    await page.getByLabel("Pool 1 name").fill("Boys");
    await page.getByLabel("Pool 1 new item").fill("Naruto");
    await page
      .getByRole("button", { name: "Add", exact: true })
      .first()
      .click();
    await page.getByRole("button", { name: "+ Add pool" }).click();
    await page.getByLabel("Pool 2 name").fill("Girls");
    await page.getByLabel("Pool 2 new item").fill("Sakura");
    await page.getByRole("button", { name: "Add", exact: true }).nth(1).click();

    await page.getByRole("button", { name: /^NxN/ }).click();

    // One round keeps the single-item pools feasible (per-side 1, no dedup
    // exhaustion).
    const rounds = page.getByLabel("Rounds", { exact: true });
    await rounds.fill("1");

    await page.getByRole("button", { name: "Publish" }).click();

    await page.waitForURL("**/packs/pack-nxn");
    expect(captured.body).toMatchObject({ format: "nxn" });
    expect(captured.body?.groups).toBeDefined();
    expect(captured.body?.rounds).toBeDefined();
    expect(captured.body).not.toHaveProperty("categories");
    expect(captured.body).not.toHaveProperty("versusN");
  });

  test("shows a validation error and does not call the API for an empty submission", async ({
    page,
  }) => {
    let called = false;
    await page.route(`${API_BASE}/packs`, (route) => {
      called = true;
      return route.fulfill({ status: 201, json: {} });
    });

    await page.goto("/create");
    await page.getByRole("button", { name: "Publish" }).click();

    await expect(page.getByText("Give your pack a title.")).toBeVisible();
    expect(called).toBe(false);
    expect(page.url()).toContain("/create");
  });
});
