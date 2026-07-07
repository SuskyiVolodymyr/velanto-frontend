// src/shared/lib/staff-permissions.test.ts
import { describe, expect, it } from "vitest";
import { canActOn, assignableRolesFor } from "./staff-permissions";

describe("canActOn", () => {
  it("admin can act on manager, moderator, and user", () => {
    expect(canActOn("admin", "manager")).toBe(true);
    expect(canActOn("admin", "moderator")).toBe(true);
    expect(canActOn("admin", "user")).toBe(true);
  });

  it("admin cannot act on another admin (equal rank never outranks)", () => {
    expect(canActOn("admin", "admin")).toBe(false);
  });

  it("manager can act on moderator and user, but not manager or admin", () => {
    expect(canActOn("manager", "moderator")).toBe(true);
    expect(canActOn("manager", "user")).toBe(true);
    expect(canActOn("manager", "manager")).toBe(false);
    expect(canActOn("manager", "admin")).toBe(false);
  });
});

describe("assignableRolesFor", () => {
  it("admin acting on a moderator can assign user, moderator, or manager", () => {
    expect(assignableRolesFor("admin", "moderator")).toEqual(["user", "moderator", "manager"]);
  });

  it("manager acting on a moderator can only assign user or moderator", () => {
    expect(assignableRolesFor("manager", "moderator")).toEqual(["user", "moderator"]);
  });

  it("manager acting on a manager gets no options (cannot act on equal rank)", () => {
    expect(assignableRolesFor("manager", "manager")).toEqual([]);
  });

  it("admin acting on an admin gets no options", () => {
    expect(assignableRolesFor("admin", "admin")).toEqual([]);
  });
});
