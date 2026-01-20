/**
 * Autopilot Summary Text Tests (PR-79)
 * TDD: Tests for generating summary text based on status and error.
 */
import { describe, it, expect } from "vitest";
import { getAutopilotSummaryText } from "../autopilot-summary-text";

describe("getAutopilotSummaryText", () => {
  describe("COMPLETED status", () => {
    it("returns review message for completed runs", () => {
      const result = getAutopilotSummaryText({ status: "COMPLETED" });
      expect(result).toBe("Review results and merge when ready.");
    });
  });

  describe("CANCELLED status", () => {
    it("returns start again message for cancelled runs", () => {
      const result = getAutopilotSummaryText({ status: "CANCELLED" });
      expect(result).toBe("You can start again anytime.");
    });
  });

  describe("FAILED status", () => {
    it("returns guidance text for structured error", () => {
      const result = getAutopilotSummaryText({
        status: "FAILED",
        runError: JSON.stringify({ code: "BUDGET_EXCEEDED", message: "Limit reached" }),
      });
      expect(result).toBe("Budget limit exceeded");
    });

    it("returns fallback text when no error", () => {
      const result = getAutopilotSummaryText({ status: "FAILED" });
      expect(result).toBe("Open details to see logs and guidance.");
    });

    it("returns fallback text for invalid error JSON", () => {
      const result = getAutopilotSummaryText({
        status: "FAILED",
        runError: "not valid json",
      });
      expect(result).toBe("Open details to see logs and guidance.");
    });

    it("returns guidance text for AI_NOT_CONFIGURED error", () => {
      const result = getAutopilotSummaryText({
        status: "FAILED",
        runError: JSON.stringify({ code: "AI_NOT_CONFIGURED", message: "Key missing" }),
      });
      expect(result).toBe("AI not configured");
    });

    it("returns guidance text for REPO_NOT_READY error", () => {
      const result = getAutopilotSummaryText({
        status: "FAILED",
        runError: JSON.stringify({ code: "REPO_NOT_READY", message: "Not cloned" }),
      });
      expect(result).toBe("Repository not ready");
    });

    it("returns guidance text for GIT_ERROR", () => {
      const result = getAutopilotSummaryText({
        status: "FAILED",
        runError: JSON.stringify({ code: "GIT_ERROR", message: "Push failed" }),
      });
      expect(result).toBe("Git operation failed");
    });

    it("returns fallback for UNKNOWN error code", () => {
      const result = getAutopilotSummaryText({
        status: "FAILED",
        runError: JSON.stringify({ code: "UNKNOWN", message: "Something" }),
      });
      expect(result).toBe("Unexpected error");
    });
  });

  describe("other statuses", () => {
    it("returns empty string for RUNNING status", () => {
      const result = getAutopilotSummaryText({ status: "RUNNING" });
      expect(result).toBe("");
    });

    it("returns empty string for IDLE status", () => {
      const result = getAutopilotSummaryText({ status: "IDLE" });
      expect(result).toBe("");
    });
  });
});
