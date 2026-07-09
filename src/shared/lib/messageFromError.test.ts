import { describe, expect, it } from "vitest";
import { messageFromError } from "./messageFromError";
import { ApiError } from "./api-client";

describe("messageFromError", () => {
  it("returns the string message from an ApiError body", () => {
    const err = new ApiError(400, "Bad Request", { message: "Title is required." });
    expect(messageFromError(err)).toBe("Title is required.");
  });

  it("returns the first message when the body carries an array (Nest validation)", () => {
    const err = new ApiError(400, "Bad Request", {
      message: ["username must be longer", "email must be an email"],
    });
    expect(messageFromError(err)).toBe("username must be longer");
  });

  it("falls back to the default message for a non-ApiError value", () => {
    expect(messageFromError(new Error("boom"))).toBe("Something went wrong. Please try again.");
    expect(messageFromError("nope")).toBe("Something went wrong. Please try again.");
    expect(messageFromError(null)).toBe("Something went wrong. Please try again.");
  });

  it("falls back to the default message when the ApiError has no usable body message", () => {
    expect(messageFromError(new ApiError(500, "Server Error", null))).toBe(
      "Something went wrong. Please try again.",
    );
    expect(messageFromError(new ApiError(500, "Server Error", {}))).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("ignores an empty-string or empty-array body message and uses the fallback", () => {
    expect(messageFromError(new ApiError(400, "Bad Request", { message: "" }))).toBe(
      "Something went wrong. Please try again.",
    );
    expect(messageFromError(new ApiError(400, "Bad Request", { message: [] }))).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("uses a caller-supplied fallback string", () => {
    expect(messageFromError(new Error("boom"), { fallback: "Custom fallback." })).toBe(
      "Custom fallback.",
    );
  });

  it("uses a status-specific fallback when the ApiError has no body message", () => {
    const err = new ApiError(401, "Unauthorized", null);
    expect(messageFromError(err, { statusFallbacks: { 401: "Invalid credentials." } })).toBe(
      "Invalid credentials.",
    );
  });

  it("prefers a real body message over the status-specific fallback", () => {
    const err = new ApiError(401, "Unauthorized", { message: "Account locked." });
    expect(messageFromError(err, { statusFallbacks: { 401: "Invalid credentials." } })).toBe(
      "Account locked.",
    );
  });

  it("falls through a non-matching status to the generic fallback", () => {
    const err = new ApiError(403, "Forbidden", null);
    expect(messageFromError(err, { statusFallbacks: { 401: "Invalid credentials." } })).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
