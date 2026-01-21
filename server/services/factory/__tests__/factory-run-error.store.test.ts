/** Factory Run Error Store Tests (PR-92) */
import { describe, it, expect } from "vitest";
import {
  serializeFactoryError,
  serializeError,
  deserializeFactoryError,
  getStoredError,
} from "../factory-run-error.store";
import { FactoryErrorCode, createFactoryError } from "@/types/factory-errors";

describe("serializeFactoryError", () => {
  it("serializes FactoryError to JSON string", () => {
    const error = createFactoryError(FactoryErrorCode.BUDGET_EXCEEDED, "Budget limit");
    const result = serializeFactoryError(error);
    expect(typeof result).toBe("string");
    expect(JSON.parse(result)).toEqual(error);
  });

  it("includes details if present", () => {
    const error = createFactoryError(FactoryErrorCode.UNKNOWN, "Error", "stack trace");
    const result = serializeFactoryError(error);
    const parsed = JSON.parse(result);
    expect(parsed.details).toBe("stack trace");
  });
});

describe("serializeError", () => {
  it("normalizes and serializes any error", () => {
    const error = new Error("Budget exceeded");
    const result = serializeError(error);
    const parsed = JSON.parse(result);
    expect(parsed.code).toBe(FactoryErrorCode.BUDGET_EXCEEDED);
    expect(parsed.message).toBe("Budget exceeded");
  });

  it("handles string errors", () => {
    const result = serializeError("Simple string error");
    const parsed = JSON.parse(result);
    expect(parsed.code).toBe(FactoryErrorCode.UNKNOWN);
    expect(parsed.message).toBe("Simple string error");
  });
});

describe("deserializeFactoryError", () => {
  it("deserializes valid FactoryError JSON", () => {
    const original = createFactoryError(FactoryErrorCode.WORKER_CRASHED, "Crash");
    const json = JSON.stringify(original);
    const result = deserializeFactoryError(json);
    expect(result).toEqual(original);
  });

  it("returns null for null input", () => {
    expect(deserializeFactoryError(null)).toBeNull();
  });

  it("handles legacy plain string JSON", () => {
    const json = JSON.stringify("Legacy error message");
    const result = deserializeFactoryError(json);
    expect(result?.code).toBe(FactoryErrorCode.UNKNOWN);
    expect(result?.message).toBe("Legacy error message");
  });

  it("handles raw string (non-JSON)", () => {
    const result = deserializeFactoryError("Not JSON at all");
    expect(result?.code).toBe(FactoryErrorCode.UNKNOWN);
    expect(result?.message).toBe("Not JSON at all");
  });

  it("returns null for invalid JSON object", () => {
    const json = JSON.stringify({ foo: "bar" });
    const result = deserializeFactoryError(json);
    expect(result).toBeNull();
  });
});

describe("getStoredError", () => {
  it("returns error with guidance for valid error", () => {
    const error = createFactoryError(FactoryErrorCode.BUDGET_EXCEEDED, "Budget limit");
    const json = JSON.stringify(error);
    const result = getStoredError(json);
    expect(result).not.toBeNull();
    expect(result!.error).toEqual(error);
    expect(result!.guidance.severity).toBe("critical");
    expect(result!.guidance.steps.length).toBeGreaterThan(0);
  });

  it("returns null for null input", () => {
    expect(getStoredError(null)).toBeNull();
  });

  it("returns guidance with appropriate severity", () => {
    const error = createFactoryError(FactoryErrorCode.QUEUE_CORRUPTED, "Queue bad");
    const json = JSON.stringify(error);
    const result = getStoredError(json);
    expect(result!.guidance.severity).toBe("warning");
  });
});
