import { describe, expect, it } from "vitest";

import {
  FEEDBACK_SORTS,
  FEEDBACK_STATUSES,
  FEEDBACK_TOPICS,
  FEEDBACK_VISIBILITIES,
} from "./feedback";
import { PACK_FORMATS, PACK_STATUSES } from "./pack";
import { REPORT_STATUSES, REPORT_TYPES } from "./report";
import { ROLES } from "./user";

// Guards against silent drift of the wire-contract string literals: these
// arrays mirror the backend's accepted values, so their membership must stay
// byte-identical. If a value changes here, it must change in the backend too.
describe("domain const arrays", () => {
  it("PACK_FORMATS", () => {
    expect([...PACK_FORMATS]).toEqual([
      "save_one",
      "sacrifice_one",
      "nxn",
      "rank_blind",
      "1v1",
    ]);
  });

  it("PACK_STATUSES", () => {
    expect([...PACK_STATUSES]).toEqual(["pending", "approved", "rejected"]);
  });

  it("FEEDBACK_TOPICS", () => {
    expect([...FEEDBACK_TOPICS]).toEqual([
      "bug",
      "feature",
      "translation",
      "other",
    ]);
  });

  it("FEEDBACK_VISIBILITIES", () => {
    expect([...FEEDBACK_VISIBILITIES]).toEqual(["everyone", "staff_only"]);
  });

  it("FEEDBACK_STATUSES", () => {
    expect([...FEEDBACK_STATUSES]).toEqual([
      "new",
      "in_progress",
      "done",
      "declined",
    ]);
  });

  it("FEEDBACK_SORTS", () => {
    expect([...FEEDBACK_SORTS]).toEqual(["new", "top"]);
  });

  it("REPORT_TYPES", () => {
    expect([...REPORT_TYPES]).toEqual(["pack", "user", "round"]);
  });

  it("REPORT_STATUSES", () => {
    expect([...REPORT_STATUSES]).toEqual(["new", "reviewing", "closed"]);
  });

  it("ROLES", () => {
    expect([...ROLES]).toEqual(["user", "moderator", "admin", "manager"]);
  });
});
