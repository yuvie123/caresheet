import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { friendlyError, PAUSED } from "./errors";

const apiError = (status: number, message: string) =>
  new Anthropic.APIError(status, { error: { message } }, message, new Headers());

describe("friendlyError", () => {
  it("says live reading is paused when credit or the key is the problem", () => {
    expect(friendlyError(apiError(400, "Your credit balance is too low to access the Anthropic API"))).toBe(PAUSED);
    expect(friendlyError(apiError(401, "invalid x-api-key"))).toBe(PAUSED);
    expect(friendlyError(apiError(403, "forbidden"))).toBe(PAUSED);
  });
  it("maps busy, too-large and server errors to plain language", () => {
    expect(friendlyError(apiError(429, "rate limited"))).toMatch(/busy/);
    expect(friendlyError(apiError(529, "overloaded_error"))).toMatch(/busy/);
    expect(friendlyError(apiError(413, "too big"))).toMatch(/too large/);
    expect(friendlyError(apiError(500, "boom"))).toMatch(/problem/);
  });
  it("never shows raw API text to the family", () => {
    expect(friendlyError(apiError(418, "I'm a teapot: internal detail"))).not.toMatch(/teapot|internal/);
  });
  it("keeps our own plain-language messages and hides raw status text", () => {
    expect(friendlyError(new Error("Claude declined to process these documents."))).toBe("Claude declined to process these documents.");
    expect(friendlyError(new Error("529 {\"type\":\"error\"}"))).toBe("Something went wrong. Please try again.");
    expect(friendlyError("weird")).toBe("Something went wrong. Please try again.");
  });
});
