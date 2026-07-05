import { test, expect } from "@playwright/test";

test.describe("homepage", () => {
  test("returns 200 and has the expected title", async ({ page }) => {
    const response = await page.goto("/");

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("Velanto");
  });
});
