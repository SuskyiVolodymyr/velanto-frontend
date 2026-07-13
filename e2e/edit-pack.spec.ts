import { test, expect } from "@playwright/test";
import { PACKS } from "./mock-backend";

const API_BASE = "http://localhost:3001";

const MOCK_USER = {
  id: "u1",
  email: "alice@example.com",
  username: "alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

// The edit and detail pages load their pack in a Server Component
// (getPackServer / getResultsServer) — the shared mock backend on :3001
// (e2e/mock-backend.ts) serves those server-side GETs for fixture "pack-1", an
// approved pack owned by u1. Browser-issued calls (/auth/refresh, PATCH,
// DELETE) are handled by page.route in each test.

test.describe("Edit & delete pack", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_BASE}/auth/refresh`, (route) =>
      route.fulfill({
        status: 201,
        json: { accessToken: "access-token", user: MOCK_USER },
      }),
    );
  });

  test("the author edits their pack via the reused form and is redirected back", async ({
    page,
  }) => {
    const captured: { body: Record<string, unknown> | null } = { body: null };
    await page.route(`${API_BASE}/packs/pack-1`, (route) => {
      if (route.request().method() === "PATCH") {
        captured.body = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          json: {
            ...PACKS["pack-1"],
            title: "Edited Title",
            status: "pending",
          },
        });
      }
      return route.fallback();
    });

    await page.goto("/packs/pack-1/edit");

    // The form is seeded from the pack; the submit button is in edit mode.
    await expect(page.getByLabel("Pack title")).toHaveValue("Original Title");
    await expect(
      page.getByRole("button", { name: "Save changes" }),
    ).toBeVisible();

    await page.getByLabel("Pack title").fill("Edited Title");
    await page.getByRole("button", { name: "Save changes" }).click();

    await page.waitForURL("**/packs/pack-1");
    expect(captured.body).toMatchObject({
      title: "Edited Title",
      format: "save_one",
    });
    expect(captured.body?.groups).toBeDefined();
    expect(captured.body?.rounds).toBeDefined();
  });

  test("a non-author is blocked from the edit page", async ({ page }) => {
    await page.route(`${API_BASE}/auth/refresh`, (route) =>
      route.fulfill({
        status: 201,
        json: {
          accessToken: "access-token",
          user: { ...MOCK_USER, id: "someone-else" },
        },
      }),
    );

    await page.goto("/packs/pack-1/edit");

    await expect(
      page.getByText("You can only edit your own packs."),
    ).toBeVisible();
    await expect(page.getByLabel("Pack title")).toHaveCount(0);
  });

  test("the author deletes their pack from the detail page via the confirm modal", async ({
    page,
  }) => {
    let deleteCalled = false;
    await page.route(`${API_BASE}/packs/pack-1`, (route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true;
        return route.fulfill({ status: 200, json: { deleted: true } });
      }
      return route.fallback();
    });

    await page.goto("/packs/pack-1");

    await page.getByRole("button", { name: "Delete" }).click();
    // The confirmation modal gates the destructive action.
    await expect(
      page.getByRole("heading", { name: "Delete this pack?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete pack" }).click();

    await page.waitForURL((url) => new URL(url).pathname === "/");
    expect(deleteCalled).toBe(true);
  });
});
