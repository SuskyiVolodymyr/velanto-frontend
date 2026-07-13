import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";

const API_BASE = "http://localhost:3001";
const API_PORT = 3001;

// Serial so a single worker owns the :3001 mock backend for the whole file.
test.describe.configure({ mode: "serial" });

const MOCK_USER = {
  id: "u1",
  email: "alice@example.com",
  username: "alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

// An approved pack owned by u1. Two items so the save_one round's manual draw
// meets the min-draw of 2, keeping the seeded edit form valid on submit.
const PACK = {
  id: "pack-1",
  title: "Original Title",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  format: "save_one",
  tags: ["Anime"],
  groups: [
    {
      id: "g1",
      name: "2016",
      items: [
        { id: "i1", type: "text", title: "AoT", value: "Guren" },
        { id: "i2", type: "text", title: "Redo", value: "Redo" },
      ],
    },
  ],
  rounds: [{ id: "r1", slots: [{ groupId: "g1", mode: "manual" }] }],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

const RESULTS = {
  packId: "pack-1",
  format: "save_one",
  totalPlays: 0,
  rounds: [],
};

// The edit and detail pages load their pack in a Server Component
// (getPackServer / getResultsServer), whose fetch originates from the Next
// server process — page.route only sees browser-issued requests. A tiny real
// backend on :3001 serves those server-side GETs; browser-issued calls
// (/auth/refresh, PATCH, DELETE) are handled by page.route in each test.
let server: Server;

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const url = req.url ?? "";
    if (req.method === "GET" && /^\/packs\/pack-1\/results$/.test(url)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(RESULTS));
      return;
    }
    if (req.method === "GET" && /^\/packs\/pack-1$/.test(url)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(PACK));
      return;
    }
    if (req.method === "GET" && /^\/packs(\?|$)/.test(url)) {
      // Home feed after a delete redirect — an empty envelope keeps it happy.
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ items: [], total: 0, page: 1, limit: 20 }));
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(API_PORT, resolve));
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

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
          json: { ...PACK, title: "Edited Title", status: "pending" },
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
