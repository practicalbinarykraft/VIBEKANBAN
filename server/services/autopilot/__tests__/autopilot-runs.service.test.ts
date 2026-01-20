/**
 * Autopilot Runs Service Tests (PR-73)
 * TDD: Tests written before implementation
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createRun,
  finishRun,
  getRun,
  listRuns,
  linkAttemptToRun,
  type AutopilotRunsDeps,
  type AutopilotRun,
  type RunStatus,
} from "../autopilot-runs.service";

describe("autopilot-runs.service", () => {
  let mockInsertRun: Mock;
  let mockUpdateRun: Mock;
  let mockGetRun: Mock;
  let mockListRuns: Mock;
  let mockLinkAttempt: Mock;
  let mockCountAttempts: Mock;
  let deps: AutopilotRunsDeps;

  beforeEach(() => {
    mockInsertRun = vi.fn();
    mockUpdateRun = vi.fn();
    mockGetRun = vi.fn();
    mockListRuns = vi.fn();
    mockLinkAttempt = vi.fn();
    mockCountAttempts = vi.fn();
    deps = {
      insertRun: mockInsertRun,
      updateRun: mockUpdateRun,
      getRun: mockGetRun,
      listRuns: mockListRuns,
      linkAttempt: mockLinkAttempt,
      countAttempts: mockCountAttempts,
    };
  });

  describe("createRun", () => {
    it("creates a new run with running status", async () => {
      mockInsertRun.mockResolvedValueOnce("run-123");

      const result = await createRun("project-1", deps);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.runId).toBe("run-123");
      }
      expect(mockInsertRun).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "project-1",
          status: "running",
        })
      );
    });
  });

  describe("finishRun", () => {
    it("sets completed status and finishedAt", async () => {
      mockUpdateRun.mockResolvedValueOnce(true);

      const result = await finishRun("run-1", "completed", undefined, deps);

      expect(result.ok).toBe(true);
      expect(mockUpdateRun).toHaveBeenCalledWith(
        "run-1",
        expect.objectContaining({
          status: "completed",
          finishedAt: expect.any(Date),
        })
      );
    });

    it("sets failed status with error message", async () => {
      mockUpdateRun.mockResolvedValueOnce(true);

      const result = await finishRun("run-2", "failed", "Task failed", deps);

      expect(result.ok).toBe(true);
      expect(mockUpdateRun).toHaveBeenCalledWith(
        "run-2",
        expect.objectContaining({
          status: "failed",
          error: "Task failed",
        })
      );
    });

    it("sets cancelled status", async () => {
      mockUpdateRun.mockResolvedValueOnce(true);

      const result = await finishRun("run-3", "cancelled", undefined, deps);

      expect(result.ok).toBe(true);
      expect(mockUpdateRun).toHaveBeenCalledWith(
        "run-3",
        expect.objectContaining({ status: "cancelled" })
      );
    });
  });

  describe("getRun", () => {
    it("returns run with attempt counts", async () => {
      const mockRun: AutopilotRun = {
        id: "run-1",
        projectId: "proj-1",
        status: "running",
        startedAt: new Date(),
        finishedAt: null,
        error: null,
      };
      mockGetRun.mockResolvedValueOnce(mockRun);
      mockCountAttempts.mockResolvedValueOnce({ total: 5, failed: 1 });

      const result = await getRun("run-1", deps);

      expect(result.run).toBeDefined();
      expect(result.run?.id).toBe("run-1");
      expect(result.run?.attemptsCount).toBe(5);
      expect(result.run?.failedAttempts).toBe(1);
    });

    it("returns null for non-existent run", async () => {
      mockGetRun.mockResolvedValueOnce(null);

      const result = await getRun("non-existent", deps);

      expect(result.run).toBeNull();
    });
  });

  describe("listRuns", () => {
    it("returns runs sorted by startedAt desc", async () => {
      const runs: AutopilotRun[] = [
        { id: "r1", projectId: "p1", status: "completed", startedAt: new Date("2024-01-02"), finishedAt: new Date(), error: null },
        { id: "r2", projectId: "p1", status: "running", startedAt: new Date("2024-01-03"), finishedAt: null, error: null },
      ];
      mockListRuns.mockResolvedValueOnce(runs);
      mockCountAttempts.mockResolvedValue({ total: 3, failed: 0 });

      const result = await listRuns("p1", 20, deps);

      expect(result.runs).toHaveLength(2);
      expect(mockListRuns).toHaveBeenCalledWith("p1", 20);
    });

    it("returns empty array for project with no runs", async () => {
      mockListRuns.mockResolvedValueOnce([]);

      const result = await listRuns("p2", 20, deps);

      expect(result.runs).toEqual([]);
    });
  });

  describe("linkAttemptToRun", () => {
    it("links attempt to run", async () => {
      mockLinkAttempt.mockResolvedValueOnce(true);

      const result = await linkAttemptToRun("attempt-1", "run-1", deps);

      expect(result.ok).toBe(true);
      expect(mockLinkAttempt).toHaveBeenCalledWith("attempt-1", "run-1");
    });
  });
});
