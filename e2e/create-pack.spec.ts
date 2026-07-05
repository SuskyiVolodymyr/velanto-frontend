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
      route.fulfill({ status: 201, json: { accessToken: "access-token", user: MOCK_USER } }),
    );
  });

  test("publishes a valid pack and redirects to its detail page", async ({ page }) => {
    await page.route(`${API_BASE}/packs`, (route) =>
      route.fulfill({
        status: 201,
        json: {
          id: "pack-1",
          title: "Best Anime Openings",
          description: "Pick your favorite each round.",
          coverTone: "#2b2a3a",
          format: "save_one",
          tags: [],
          groups: [],
          authorId: "u1",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    );

    await page.goto("/create");
    await page.getByLabel("Pack title").fill("Best Anime Openings");
    await page.getByLabel("Pack description").fill("Pick your favorite each round.");
    await page.getByLabel("Group 1 name").fill("2016");
    await page.getByLabel("Group 1 new item").fill("Guren no Yumiya");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: "Publish" }).click();

    await page.waitForURL("**/packs/pack-1");
  });

  test("shows a validation error and does not call the API for an empty submission", async ({ page }) => {
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
