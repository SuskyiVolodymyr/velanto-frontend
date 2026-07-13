import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";

const API_BASE = "http://localhost:3001";
const API_PORT = 3001;

// Serial so a single worker owns the :3001 mock backend for the whole file —
// under fullyParallel, multiple workers would otherwise each try to bind it.
test.describe.configure({ mode: "serial" });

const MOCK_USER = {
  id: "u1",
  email: "alice@example.com",
  username: "alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function textItem(id: string, title: string) {
  return { id, type: "text", title, value: title };
}

const BASE_PACK = {
  coverTone: "#2b2a3a",
  tags: ["Anime"],
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

// Manual slots keep candidates in authored order, so the play-through is
// deterministic. For nxn, both sides are manual pools shown whole every round
// (manual doesn't consume the used-set), so the side we pick is stable.
const groupsRound = (id: string, groupId: string) => ({
  id,
  slots: [{ groupId, mode: "manual" }],
});
const versusRound = (id: string) => ({
  id,
  slots: [
    { groupId: "ca", mode: "manual" },
    { groupId: "cb", mode: "manual" },
  ],
});

const PACKS: Record<string, unknown> = {
  "pack-save": {
    ...BASE_PACK,
    id: "pack-save",
    title: "Save One Pack",
    description: "Pick the one you'd save.",
    format: "save_one",
    groups: [
      {
        id: "g1",
        name: "2016",
        items: [textItem("1", "Guren no Yumiya"), textItem("2", "Redo")],
      },
      { id: "g2", name: "2020", items: [textItem("3", "Silhouette")] },
    ],
    rounds: [groupsRound("r1", "g1"), groupsRound("r2", "g2")],
  },
  "pack-sacrifice": {
    ...BASE_PACK,
    id: "pack-sacrifice",
    title: "Sacrifice One Pack",
    description: "Pick the one you'd sacrifice.",
    format: "sacrifice_one",
    groups: [
      {
        id: "g1",
        name: "2016",
        items: [textItem("1", "Guren no Yumiya"), textItem("2", "Redo")],
      },
      { id: "g2", name: "2020", items: [textItem("3", "Silhouette")] },
    ],
    rounds: [groupsRound("r1", "g1"), groupsRound("r2", "g2")],
  },
  "pack-nxn": {
    ...BASE_PACK,
    id: "pack-nxn",
    title: "Boys vs Girls",
    description: "Pick a side each round.",
    format: "nxn",
    groups: [
      {
        id: "ca",
        name: "Boys",
        items: [textItem("1", "Naruto"), textItem("2", "Sasuke")],
      },
      {
        id: "cb",
        name: "Girls",
        items: [textItem("3", "Sakura"), textItem("4", "Hinata")],
      },
    ],
    rounds: [versusRound("r1"), versusRound("r2")],
  },
};

// The play page loads its pack in a Server Component (getPackServer), whose
// fetch originates from the Next server process — page.route only sees
// browser-issued requests, so it can't intercept it. A tiny real backend on
// :3001 serves those server-side GET /packs/:id calls. Browser-issued calls
// (/auth/refresh, POST plays) are still handled by page.route below.
let server: Server;

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const match = /^\/packs\/([^/]+)$/.exec(req.url ?? "");
    if (req.method === "GET" && match) {
      const pack = PACKS[match[1]];
      if (pack) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(pack));
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Not found" }));
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

      // Round 2: single item, still gated on selection.
      await expect(page.getByRole("heading", { name: "2020" })).toBeVisible();
      await expect(page.getByText("Round 2 of 2")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Next round →" }),
      ).toBeDisabled();
      await page.getByText("Silhouette").click();
      await page.getByRole("button", { name: "Next round →" }).click();

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
    await page.getByRole("button", { name: "Next round →" }).click();

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
