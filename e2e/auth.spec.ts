import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:3001";

const MOCK_USER = {
  id: "u1",
  email: "alice@example.com",
  username: "alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

test.describe("Auth screen", () => {
  test.beforeEach(async ({ page }) => {
    // No session on load — every test starts logged out.
    await page.route(`${API_BASE}/auth/refresh`, (route) =>
      route.fulfill({
        status: 401,
        json: { message: "Refresh token invalid or expired" },
      }),
    );
  });

  test("registers a new account and lands on the home page", async ({
    page,
  }) => {
    await page.route(`${API_BASE}/auth/register`, (route) =>
      route.fulfill({
        status: 201,
        json: { accessToken: "access-token", user: MOCK_USER },
      }),
    );

    await page.goto("/auth");
    await page.getByRole("tab", { name: "Sign up" }).click();
    await page.getByLabel("Username").fill("alice");
    await page.getByLabel("Email").fill("alice@example.com");
    await page.getByLabel("Password").fill("password123");
    // Registration now requires accepting the community rules (acceptedRules:
    // z.literal(true)); without ticking it the form fails client validation and
    // never calls /auth/register.
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL("/");
  });

  test("logs in with either an email or a username as the identifier", async ({
    page,
  }) => {
    let capturedBody: unknown;
    await page.route(`${API_BASE}/auth/login`, (route) => {
      capturedBody = route.request().postDataJSON();
      return route.fulfill({
        status: 201,
        json: { accessToken: "access-token", user: MOCK_USER },
      });
    });

    await page.goto("/auth");
    await page.getByLabel("Email or username").fill("alice@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.waitForURL("/");
    expect(capturedBody).toEqual({
      identifier: "alice@example.com",
      password: "password123",
    });
  });

  test("shows an error and stays on the page when the password is wrong", async ({
    page,
  }) => {
    await page.route(`${API_BASE}/auth/login`, (route) =>
      route.fulfill({ status: 401, json: { message: "Invalid credentials" } }),
    );

    await page.goto("/auth");
    await page.getByLabel("Email or username").fill("alice");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText("Invalid credentials")).toBeVisible();
    expect(page.url()).toContain("/auth");
  });
});
