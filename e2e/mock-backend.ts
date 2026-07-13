import { createServer, type Server } from "node:http";

// A single shared mock backend on :3001 for the whole Playwright run, started
// once by global-setup.ts. It answers the Server-Component fetches the app
// issues from the Next server process (getPackServer / getResultsServer), which
// page.route can't intercept because they aren't browser-issued. Browser-issued
// calls (/auth/refresh, POST /plays, PATCH/DELETE) are still handled per-test by
// page.route in the specs.
//
// One shared server (rather than each spec binding :3001 itself) is what lets
// the port-dependent specs run under Playwright's parallel workers without
// racing to bind the same port.

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
// deterministic (see play.spec.ts).
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

export const PACKS: Record<string, Record<string, unknown>> = {
  // play.spec.ts fixtures
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
  // edit-pack.spec.ts fixture — an approved pack owned by u1. Two items so the
  // save_one round's manual draw meets the min-draw of 2, keeping the seeded
  // edit form valid on submit.
  "pack-1": {
    ...BASE_PACK,
    id: "pack-1",
    title: "Original Title",
    description: "Pick your favorite each round.",
    format: "save_one",
    groups: [
      {
        id: "g1",
        name: "2016",
        items: [textItem("i1", "AoT"), textItem("i2", "Redo")],
      },
    ],
    rounds: [groupsRound("r1", "g1")],
  },
};

const RESULTS: Record<string, Record<string, unknown>> = {
  "pack-1": { packId: "pack-1", format: "save_one", totalPlays: 0, rounds: [] },
};

function json(
  res: import("node:http").ServerResponse,
  status: number,
  body: unknown,
) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export function startMockBackend(port = 3001): Promise<Server> {
  const server = createServer((req, res) => {
    const url = req.url ?? "";
    if (req.method === "GET" && url === "/health") {
      res.writeHead(200).end("ok");
      return;
    }
    let match: RegExpExecArray | null;
    if (
      req.method === "GET" &&
      (match = /^\/packs\/([^/?]+)\/results$/.exec(url))
    ) {
      const results = RESULTS[match[1]] ?? {
        packId: match[1],
        format: "save_one",
        totalPlays: 0,
        rounds: [],
      };
      json(res, 200, results);
      return;
    }
    if (req.method === "GET" && (match = /^\/packs\/([^/?]+)$/.exec(url))) {
      const pack = PACKS[match[1]];
      if (pack) {
        json(res, 200, pack);
        return;
      }
      json(res, 404, { message: "Not found" });
      return;
    }
    if (req.method === "GET" && /^\/packs(\?|$)/.test(url)) {
      // Home feed (e.g. after a delete redirect) — an empty envelope keeps it
      // happy.
      json(res, 200, { items: [], total: 0, page: 1, limit: 20 });
      return;
    }
    res.writeHead(404).end();
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
