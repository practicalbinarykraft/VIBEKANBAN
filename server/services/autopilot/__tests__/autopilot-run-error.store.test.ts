/**
 * Autopilot Run Error Store Tests (PR-77)
 * TDD: Tests for serializing/deserializing errors to string
 */
import { describe, it, expect } from "vitest";
import { serializeRunError, deserializeRunError } from "../autopilot-run-error.store";
import type { AutopilotError } from "@/types/autopilot-errors";

describe("serializeRunError", () => {
  it("serializes AutopilotError to JSON string", () => {
    const err: AutopilotError = {
      code: "BUDGET_EXCEEDED",
      message: "Monthly limit reached",
    };

    const serialized = serializeRunError(err);

    expect(typeof serialized).toBe("string");
    const parsed = JSON.parse(serialized);
    expect(parsed.code).toBe("BUDGET_EXCEEDED");
    expect(parsed.message).toBe("Monthly limit reached");
  });

  it("preserves meta in serialization", () => {
    const err: AutopilotError = {
      code: "GIT_ERROR",
      message: "Push failed",
      meta: { branch: "feature-x", exitCode: 1 },
    };

    const serialized = serializeRunError(err);
    const parsed = JSON.parse(serialized);

    expect(parsed.meta).toEqual({ branch: "feature-x", exitCode: 1 });
  });
});

describe("deserializeRunError", () => {
  it("deserializes valid JSON to AutopilotError", () => {
    const json = JSON.stringify({
      code: "AI_NOT_CONFIGURED",
      message: "API key missing",
    });

    const result = deserializeRunError(json);

    expect(result).not.toBeNull();
    expect(result?.code).toBe("AI_NOT_CONFIGURED");
    expect(result?.message).toBe("API key missing");
  });

  it("returns null for null input", () => {
    const result = deserializeRunError(null);
    expect(result).toBeNull();
  });

  it("returns UNKNOWN for plain string (non-JSON)", () => {
    const result = deserializeRunError("Some error occurred");

    expect(result).not.toBeNull();
    expect(result?.code).toBe("UNKNOWN");
    expect(result?.message).toBe("Some error occurred");
  });

  it("returns UNKNOWN for invalid JSON", () => {
    const result = deserializeRunError("{invalid json}");

    expect(result).not.toBeNull();
    expect(result?.code).toBe("UNKNOWN");
    expect(result?.message).toBe("{invalid json}");
  });

  it("returns UNKNOWN for JSON without valid code", () => {
    const json = JSON.stringify({ message: "Some error" });
    const result = deserializeRunError(json);

    expect(result).not.toBeNull();
    expect(result?.code).toBe("UNKNOWN");
    expect(result?.message).toBe("Some error");
  });

  it("roundtrip serialize/deserialize preserves data", () => {
    const original: AutopilotError = {
      code: "REPO_NOT_READY",
      message: "Not cloned yet",
      meta: { repoId: "repo-123" },
    };

    const serialized = serializeRunError(original);
    const deserialized = deserializeRunError(serialized);

    expect(deserialized).toEqual(original);
  });
});
