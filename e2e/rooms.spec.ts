import { test, expect } from "@playwright/test";

/**
 * Rooms UI golden paths (2026-07-29 rooms-ui plan, Task 30): Claim (the
 * restored pre-dormancy path) and Guess Who (the richest new mode, exercising
 * mode picker -> blind round -> reveal -> guessing -> identity-reveal).
 *
 * BLOCKED in this repo's e2e harness, and marked `test.fixme` rather than
 * faked, for a reason worth spelling out rather than silently working around:
 *
 * Every other spec in e2e/ (play.spec.ts, create-pack.spec.ts, etc.) runs
 * against `e2e/mock-backend.ts` — a plain HTTP fixture server on :3001,
 * started once by global-setup.ts, that answers Server-Component pack fetches
 * with static JSON. Browser-issued calls are mocked per-spec with
 * `page.route`. There is no real velanto-backend process anywhere in this
 * harness, and confirmed by reading mock-backend.ts in full: it implements
 * zero socket.io / friends-rooms surface (no `/friends-rooms/*` REST routes,
 * no WebSocket gateway at all).
 *
 * A friends room is NOT a request/response flow `page.route` can fake — every
 * screen this plan built (RoomLobby's ready-toggle, RoomRound's live claims,
 * RoomBetween's countdown, the guessing endgame) is driven by
 * `useFriendsRoom`'s socket.io client receiving server-pushed events
 * (`room.state`, `claim.updated`, `round.resolved`, `guessing.started`,
 * `identity.revealed`, ...). Faking that convincingly enough to prove a real
 * end-to-end round trip means either (a) a real velanto-backend dev server
 * (a separate repo/process this frontend-only worktree does not start), or
 * (b) a new fake socket.io gateway in mock-backend.ts that reimplements a
 * meaningful slice of the room state machine (turn order, claim resolution,
 * round advancement) — which is not "add an e2e spec," it's building a second,
 * independent implementation of backend/src/modules/friends-rooms that could
 * itself silently drift from the real engine's behavior and give false
 * confidence. That is a genuinely different, much larger piece of work than
 * this task, so it is flagged here rather than invented — the same way this
 * plan's own Task 16 flagged the missing per-player score field instead of
 * guessing at a shape for it.
 *
 * The two specs below are written to the real, current app conventions
 * (mode-picker copy, `t("room.entry.createRoom")` etc.) so they are ready to
 * un-skip the moment either a live backend or a room-capable mock exists —
 * remove the `test.fixme()` line and they should need no further changes,
 * modulo whatever the real gateway's exact event timing turns out to need.
 * Every mode's component-level behavior (blind picks stay hidden, votes are
 * public and live, turn order, the Relay insertion gaps, the identity
 * bijection, ...) already has full unit/component coverage from its own task
 * group (Tasks 11-27) — this gap is specifically the cross-process, real-time,
 * multi-browser-context round trip, which only an integration environment
 * with a real gateway can exercise.
 */

test.describe("Rooms — Claim mode golden path", () => {
  test("host creates a room, sets Claim, both players ready, play a round to the survivor", async ({
    browser,
  }) => {
    test.fixme(
      true,
      "Requires a live velanto-backend (real socket.io friends-rooms gateway) " +
        "or a new fake-socket.io room simulator in e2e/mock-backend.ts -- " +
        "neither exists in this frontend-only e2e harness. See file header.",
    );

    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.goto("/packs/pack-save");
    await hostPage.getByRole("button", { name: /create room/i }).click();
    await expect(hostPage).toHaveURL(/\/rooms\//);

    await hostPage.getByRole("button", { name: /claim/i }).click();
    await hostPage.getByRole("button", { name: /copy code/i }).click();
    const code = await hostPage.evaluate(() =>
      navigator.clipboard.readText(),
    );

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await guestPage.goto(`/rooms/join/${code}`);
    await expect(guestPage).toHaveURL(/\/rooms\//);

    await hostPage.getByRole("button", { name: /ready up/i }).click();
    await guestPage.getByRole("button", { name: /ready up/i }).click();

    await expect(hostPage.getByText(/round 1 of/i)).toBeVisible();
    await hostPage
      .getByRole("button", { name: /save|sacrifice/i })
      .first()
      .click();
    await guestPage
      .getByRole("button", { name: /save|sacrifice/i })
      .nth(1)
      .click();

    await expect(hostPage.getByText(/survivor|saved/i)).toBeVisible();
  });
});

test.describe("Rooms — Guess Who golden path", () => {
  test("mode picker to identity reveal, three players, one full round", async ({
    browser,
  }) => {
    test.fixme(
      true,
      "Requires a live velanto-backend (real socket.io friends-rooms gateway) " +
        "or a new fake-socket.io room simulator in e2e/mock-backend.ts -- " +
        "neither exists in this frontend-only e2e harness. See file header.",
    );

    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    const pages = await Promise.all(contexts.map((c) => c.newPage()));

    await pages[0].goto("/packs/pack-save");
    await pages[0].getByRole("button", { name: /create room/i }).click();
    await pages[0].getByRole("button", { name: /guess who/i }).click();
    const url = pages[0].url();
    await pages[1].goto(url);
    await pages[2].goto(url);

    for (const page of pages) {
      await page.getByRole("button", { name: /ready up/i }).click();
    }

    for (const page of pages) {
      await expect(page.getByText(/round 1 of/i)).toBeVisible();
    }

    // Every player makes a blind pick — assert the lock-in count climbs to
    // 3/3 without any page ever showing another player's choice.
    for (const page of pages) {
      await page.getByRole("button").first().click();
    }
    await expect(pages[0].getByText("3 / 3")).toBeVisible();
    await expect(pages[0].getByText(/who picked what/i)).toBeVisible();
  });
});
