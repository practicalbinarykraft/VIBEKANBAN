/** Factory Error Normalizer Tests (PR-92) - TDD */
import { describe, it, expect } from "vitest";
import { toFactoryError } from "../factory-error-normalizer";
import { FactoryErrorCode, type FactoryError } from "@/types/factory-errors";

describe("toFactoryError", () => {
  it("passes through existing FactoryError unchanged", () => {
    const input: FactoryError = {
      code: FactoryErrorCode.BUDGET_EXCEEDED,
      message: "Budget limit reached",
    };
    const result = toFactoryError(input);
    expect(result).toEqual(input);
  });

  it("normalizes Error with budget-related message", () => {
    const error = new Error("Budget exceeded for project");
    const result = toFactoryError(error);
    expect(result.code).toBe(FactoryErrorCode.BUDGET_EXCEEDED);
    expect(result.message).toContain("Budget");
  });

  it("normalizes Error with AI config message", () => {
    const error = new Error("AI provider not configured");
    const result = toFactoryError(error);
    expect(result.code).toBe(FactoryErrorCode.AI_NOT_CONFIGURED);
  });

  it("normalizes Error with queue corruption message", () => {
    const error = new Error("Queue state is corrupted");
    const result = toFactoryError(error);
    expect(result.code).toBe(FactoryErrorCode.QUEUE_CORRUPTED);
  });

  it("normalizes Error with attempt start failure", () => {
    const error = new Error("Failed to start attempt");
    const result = toFactoryError(error);
    expect(result.code).toBe(FactoryErrorCode.ATTEMPT_START_FAILED);
  });

  it("normalizes Error with attempt cancel failure", () => {
    const error = new Error("Failed to cancel attempt");
    const result = toFactoryError(error);
    expect(result.code).toBe(FactoryErrorCode.ATTEMPT_CANCEL_FAILED);
  });

  it("normalizes Error with worker crash", () => {
    const error = new Error("Worker process crashed");
    const result = toFactoryError(error);
    expect(result.code).toBe(FactoryErrorCode.WORKER_CRASHED);
  });

  it("normalizes unknown Error to UNKNOWN code", () => {
    const error = new Error("Some random error");
    const result = toFactoryError(error);
    expect(result.code).toBe(FactoryErrorCode.UNKNOWN);
    expect(result.message).toBe("Some random error");
  });

  it("normalizes string to UNKNOWN with string as message", () => {
    const result = toFactoryError("string error");
    expect(result.code).toBe(FactoryErrorCode.UNKNOWN);
    expect(result.message).toBe("string error");
  });

  it("normalizes null to UNKNOWN with generic message", () => {
    const result = toFactoryError(null);
    expect(result.code).toBe(FactoryErrorCode.UNKNOWN);
    expect(result.message).toBe("Unknown error occurred");
  });

  it("normalizes undefined to UNKNOWN with generic message", () => {
    const result = toFactoryError(undefined);
    expect(result.code).toBe(FactoryErrorCode.UNKNOWN);
    expect(result.message).toBe("Unknown error occurred");
  });

  it("does NOT include stack trace in message", () => {
    const error = new Error("Test error");
    error.stack = "Error: Test error\n    at someFunction (file.ts:123:45)";
    const result = toFactoryError(error);
    expect(result.message).not.toContain("at someFunction");
    expect(result.message).not.toContain("file.ts");
  });

  it("includes truncated stack in details if present", () => {
    const error = new Error("Test error");
    error.stack = "Error: Test error\n    at someFunction (file.ts:123:45)\n    at another (b.ts:1:1)";
    const result = toFactoryError(error);
    expect(result.details).toBeDefined();
    expect(result.details!.length).toBeLessThanOrEqual(200);
  });

  it("handles object with message property", () => {
    const obj = { message: "Object error message" };
    const result = toFactoryError(obj);
    expect(result.code).toBe(FactoryErrorCode.UNKNOWN);
    expect(result.message).toBe("Object error message");
  });
});
