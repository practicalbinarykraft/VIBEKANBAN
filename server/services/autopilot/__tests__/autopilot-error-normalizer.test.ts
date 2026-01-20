/**
 * Autopilot Error Normalizer Tests (PR-77)
 * TDD: Tests for normalizing unknown errors to AutopilotError
 */
import { describe, it, expect } from "vitest";
import { normalizeAutopilotError } from "../autopilot-error-normalizer";
import type { AutopilotError } from "@/types/autopilot-errors";

describe("normalizeAutopilotError", () => {
  it("passes through valid AutopilotError unchanged", () => {
    const input: AutopilotError = {
      code: "BUDGET_EXCEEDED",
      message: "Monthly limit reached",
      meta: { limit: 100 },
    };

    const result = normalizeAutopilotError(input);

    expect(result.code).toBe("BUDGET_EXCEEDED");
    expect(result.message).toBe("Monthly limit reached");
    expect(result.meta).toEqual({ limit: 100 });
  });

  it("normalizes Error to UNKNOWN with error message", () => {
    const input = new Error("Something went wrong");

    const result = normalizeAutopilotError(input);

    expect(result.code).toBe("UNKNOWN");
    expect(result.message).toBe("Something went wrong");
  });

  it("normalizes string to UNKNOWN with string as message", () => {
    const input = "Connection timeout";

    const result = normalizeAutopilotError(input);

    expect(result.code).toBe("UNKNOWN");
    expect(result.message).toBe("Connection timeout");
  });

  it("accepts object with valid code", () => {
    const input = {
      code: "AI_NOT_CONFIGURED",
      message: "API key missing",
    };

    const result = normalizeAutopilotError(input);

    expect(result.code).toBe("AI_NOT_CONFIGURED");
    expect(result.message).toBe("API key missing");
  });

  it("normalizes object with invalid code to UNKNOWN", () => {
    const input = {
      code: "INVALID_CODE",
      message: "Some error",
    };

    const result = normalizeAutopilotError(input);

    expect(result.code).toBe("UNKNOWN");
    expect(result.message).toBe("Some error");
  });

  it("normalizes garbage to UNKNOWN with default message", () => {
    const result1 = normalizeAutopilotError(null);
    expect(result1.code).toBe("UNKNOWN");
    expect(result1.message).toBe("Unknown error");

    const result2 = normalizeAutopilotError(undefined);
    expect(result2.code).toBe("UNKNOWN");
    expect(result2.message).toBe("Unknown error");

    const result3 = normalizeAutopilotError(42);
    expect(result3.code).toBe("UNKNOWN");
    expect(result3.message).toBe("Unknown error");

    const result4 = normalizeAutopilotError({});
    expect(result4.code).toBe("UNKNOWN");
    expect(result4.message).toBe("Unknown error");
  });

  it("preserves meta from valid AutopilotError", () => {
    const input: AutopilotError = {
      code: "GIT_ERROR",
      message: "Push failed",
      meta: { branch: "feature-x", exitCode: 1 },
    };

    const result = normalizeAutopilotError(input);

    expect(result.meta).toEqual({ branch: "feature-x", exitCode: 1 });
  });
});
