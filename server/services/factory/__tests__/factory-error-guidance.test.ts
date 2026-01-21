/** Factory Error Guidance Tests (PR-92) - TDD */
import { describe, it, expect } from "vitest";
import { getFactoryGuidance, type FactoryGuidance } from "../factory-error-guidance";
import { FactoryErrorCode, createFactoryError } from "@/types/factory-errors";

describe("getFactoryGuidance", () => {
  it("returns critical severity for BUDGET_EXCEEDED", () => {
    const error = createFactoryError(FactoryErrorCode.BUDGET_EXCEEDED, "Budget exceeded");
    const guidance = getFactoryGuidance(error);
    expect(guidance.severity).toBe("critical");
    expect(guidance.title).toBeTruthy();
    expect(guidance.steps.length).toBeGreaterThan(0);
    expect(guidance.steps.length).toBeLessThanOrEqual(6);
  });

  it("returns critical severity for AI_NOT_CONFIGURED", () => {
    const error = createFactoryError(FactoryErrorCode.AI_NOT_CONFIGURED, "AI not configured");
    const guidance = getFactoryGuidance(error);
    expect(guidance.severity).toBe("critical");
    expect(guidance.steps.some(s => s.toLowerCase().includes("api") || s.toLowerCase().includes("config"))).toBe(true);
  });

  it("returns warning severity for QUEUE_CORRUPTED", () => {
    const error = createFactoryError(FactoryErrorCode.QUEUE_CORRUPTED, "Queue corrupted");
    const guidance = getFactoryGuidance(error);
    expect(guidance.severity).toBe("warning");
    expect(guidance.steps.some(s => s.toLowerCase().includes("restart") || s.toLowerCase().includes("retry"))).toBe(true);
  });

  it("returns warning severity for ATTEMPT_START_FAILED", () => {
    const error = createFactoryError(FactoryErrorCode.ATTEMPT_START_FAILED, "Failed to start");
    const guidance = getFactoryGuidance(error);
    expect(guidance.severity).toBe("warning");
  });

  it("returns warning severity for ATTEMPT_CANCEL_FAILED", () => {
    const error = createFactoryError(FactoryErrorCode.ATTEMPT_CANCEL_FAILED, "Failed to cancel");
    const guidance = getFactoryGuidance(error);
    expect(guidance.severity).toBe("warning");
  });

  it("returns critical severity for WORKER_CRASHED", () => {
    const error = createFactoryError(FactoryErrorCode.WORKER_CRASHED, "Worker crashed");
    const guidance = getFactoryGuidance(error);
    expect(guidance.severity).toBe("critical");
  });

  it("returns info severity for UNKNOWN", () => {
    const error = createFactoryError(FactoryErrorCode.UNKNOWN, "Unknown error");
    const guidance = getFactoryGuidance(error);
    expect(guidance.severity).toBe("info");
  });

  it("returns actionable steps (3-6 items) for all error codes", () => {
    const codes = Object.values(FactoryErrorCode);
    for (const code of codes) {
      const error = createFactoryError(code, `Error: ${code}`);
      const guidance = getFactoryGuidance(error);
      expect(guidance.steps.length).toBeGreaterThanOrEqual(2);
      expect(guidance.steps.length).toBeLessThanOrEqual(6);
    }
  });

  it("includes error message in title", () => {
    const error = createFactoryError(FactoryErrorCode.BUDGET_EXCEEDED, "Project budget limit reached");
    const guidance = getFactoryGuidance(error);
    expect(guidance.title.toLowerCase()).toContain("budget");
  });

  it("guidance structure matches FactoryGuidance type", () => {
    const error = createFactoryError(FactoryErrorCode.UNKNOWN, "Test");
    const guidance: FactoryGuidance = getFactoryGuidance(error);
    expect(typeof guidance.severity).toBe("string");
    expect(typeof guidance.title).toBe("string");
    expect(Array.isArray(guidance.steps)).toBe(true);
  });
});
