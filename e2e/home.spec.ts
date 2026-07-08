import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:3001";

const PACK_A = {
  id: "pack-a",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  format: "save_one",
  tags: ["Anime", "Music"],
  groups: [{ id: "g1", name: "2016", selectionMode: "manual", items: [] }],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
};

test.describe("Home feed", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_BASE}/auth/refresh`, (route) =>
      route.fulfill({ status: 401, json: { message: "Refresh token invalid or expired" } }),
    );
  });

  test("lists packs returned by the backend", async ({ page }) => {
    await page.route(`${API_BASE}/packs*`, (route) =>
      route.fulfill({ status: 200, json: { items: [PACK_A], total: 1, page: 1, limit: 20 } }),
    );

    await page.goto("/");

    await expect(page.getByText("Best Anime Openings")).toBeVisible();
  });

  test("shows the empty state when the backend returns no packs", async ({ page }) => {
    await page.route(`${API_BASE}/packs*`, (route) =>
      route.fulfill({ status: 200, json: { items: [], total: 0, page: 1, limit: 20 } }),
    );

    await page.goto("/");

    await expect(page.getByText("No packs match these filters yet.")).toBeVisible();
  });

  test("re-requests with the selected format when a chip is clicked", async ({ page }) => {
    const requestedUrls: string[] = [];
    await page.route(`${API_BASE}/packs*`, (route) => {
      requestedUrls.push(route.request().url());
      return route.fulfill({ status: 200, json: { items: [PACK_A], total: 1, page: 1, limit: 20 } });
    });

    await page.goto("/");
    await page.getByText("Best Anime Openings").waitFor();
    await page.getByRole("button", { name: "Sacrifice One" }).click();

    await expect
      .poll(() => requestedUrls.some((url) => url.includes("format=sacrifice_one")))
      .toBe(true);
  });
});
