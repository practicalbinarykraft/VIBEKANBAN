/**
 * Autopilot Error Guidance Tests (PR-77)
 * TDD: Tests for mapping errors to user guidance
 */
import { describe, it, expect } from "vitest";
import { getGuidanceForError, type ErrorGuidance } from "../autopilot-error-guidance";
import type { AutopilotError } from "@/types/autopilot-errors";

describe("getGuidanceForError", () => {
  it("returns guidance for AI_NOT_CONFIGURED", () => {
    const err: AutopilotError = { code: "AI_NOT_CONFIGURED", message: "No API key" };

    const guidance = getGuidanceForError(err);

    expect(guidance.title).toBeTruthy();
    expect(guidance.nextSteps.length).toBeGreaterThan(0);
    expect(guidance.severity).toBe("critical");
  });

  it("returns guidance for BUDGET_EXCEEDED", () => {
    const err: AutopilotError = { code: "BUDGET_EXCEEDED", message: "Limit reached" };

    const guidance = getGuidanceForError(err);

    expect(guidance.title).toBeTruthy();
    expect(guidance.nextSteps.length).toBeGreaterThan(0);
    expect(guidance.severity).toBe("warning");
  });

  it("returns guidance for EMPTY_DIFF", () => {
    const err: AutopilotError = { code: "EMPTY_DIFF", message: "No changes" };

    const guidance = getGuidanceForError(err);

    expect(guidance.title).toBeTruthy();
    expect(guidance.nextSteps.length).toBeGreaterThan(0);
    expect(guidance.severity).toBe("info");
  });

  it("returns guidance for REPO_NOT_READY", () => {
    const err: AutopilotError = { code: "REPO_NOT_READY", message: "Not cloned" };

    const guidance = getGuidanceForError(err);

    expect(guidance.title).toBeTruthy();
    expect(guidance.nextSteps.length).toBeGreaterThan(0);
    expect(guidance.severity).toBe("critical");
  });

  it("returns guidance for OPEN_PR_LIMIT", () => {
    const err: AutopilotError = { code: "OPEN_PR_LIMIT", message: "Too many PRs" };

    const guidance = getGuidanceForError(err);

    expect(guidance.title).toBeTruthy();
    expect(guidance.nextSteps.length).toBeGreaterThan(0);
    expect(guidance.severity).toBe("warning");
  });

  it("returns guidance for GIT_ERROR", () => {
    const err: AutopilotError = { code: "GIT_ERROR", message: "Push failed" };

    const guidance = getGuidanceForError(err);

    expect(guidance.title).toBeTruthy();
    expect(guidance.nextSteps.length).toBeGreaterThan(0);
    expect(guidance.severity).toBe("critical");
  });

  it("returns guidance for CANCELLED_BY_USER", () => {
    const err: AutopilotError = { code: "CANCELLED_BY_USER", message: "User stopped" };

    const guidance = getGuidanceForError(err);

    expect(guidance.title).toBeTruthy();
    expect(guidance.nextSteps.length).toBeGreaterThan(0);
    expect(guidance.severity).toBe("info");
  });

  it("returns guidance for UNKNOWN with fallback message", () => {
    const err: AutopilotError = { code: "UNKNOWN", message: "Something failed" };

    const guidance = getGuidanceForError(err);

    expect(guidance.title).toBeTruthy();
    expect(guidance.nextSteps.length).toBeGreaterThan(0);
    expect(["info", "warning", "critical"]).toContain(guidance.severity);
  });

  it("severity is valid type for all error codes", () => {
    const codes = [
      "AI_NOT_CONFIGURED",
      "BUDGET_EXCEEDED",
      "EMPTY_DIFF",
      "REPO_NOT_READY",
      "OPEN_PR_LIMIT",
      "GIT_ERROR",
      "CANCELLED_BY_USER",
      "UNKNOWN",
    ] as const;

    for (const code of codes) {
      const guidance = getGuidanceForError({ code, message: "test" });
      expect(["info", "warning", "critical"]).toContain(guidance.severity);
    }
  });
});
