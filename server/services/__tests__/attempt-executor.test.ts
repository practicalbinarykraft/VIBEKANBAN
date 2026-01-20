/** Attempt Executor Tests (PR-66) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AttemptExecutor, ExecuteParams } from "../autopilot/attempt-executor";

describe("AttemptExecutor", () => {
  let executor: AttemptExecutor;
  let mockRunner: { run: ReturnType<typeof vi.fn> };
  let mockLogSink: { append: ReturnType<typeof vi.fn> };
  let mockArtifactStore: { save: ReturnType<typeof vi.fn> };
  let mockStatusRepo: {
    markRunning: ReturnType<typeof vi.fn>;
    markSucceeded: ReturnType<typeof vi.fn>;
    markFailed: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRunner = {
      run: vi.fn().mockResolvedValue({ exitCode: 0, output: "Success" }),
    };

    mockLogSink = {
      append: vi.fn().mockResolvedValue(undefined),
    };

    mockArtifactStore = {
      save: vi.fn().mockResolvedValue({ artifactId: "artifact-123" }),
    };

    mockStatusRepo = {
      markRunning: vi.fn().mockResolvedValue(undefined),
      markSucceeded: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
    };

    executor = new AttemptExecutor();
  });

  const createParams = (overrides?: Partial<ExecuteParams>): ExecuteParams => ({
    attemptId: "attempt-123",
    taskId: "task-456",
    projectId: "project-789",
    runner: mockRunner as any,
    logSink: mockLogSink as any,
    artifactStore: mockArtifactStore as any,
    statusRepo: mockStatusRepo as any,
    now: () => new Date("2026-01-20T10:00:00Z"),
    timeout: 5000,
    ...overrides,
  });

  describe("executeAttempt - success path", () => {
    it("marks attempt as running first", async () => {
      await executor.executeAttempt(createParams());

      expect(mockStatusRepo.markRunning).toHaveBeenCalledWith(
        "attempt-123",
        expect.any(Date)
      );
    });

    it("calls runner with correct params", async () => {
      await executor.executeAttempt(createParams());

      expect(mockRunner.run).toHaveBeenCalledWith(
        expect.objectContaining({
          attemptId: "attempt-123",
          projectId: "project-789",
          taskId: "task-456",
        })
      );
    });

    it("saves artifact on success", async () => {
      await executor.executeAttempt(createParams());

      expect(mockArtifactStore.save).toHaveBeenCalledWith(
        "attempt-123",
        expect.objectContaining({ kind: "runner_output" })
      );
    });

    it("marks attempt as succeeded", async () => {
      const result = await executor.executeAttempt(createParams());

      expect(result.status).toBe("succeeded");
      expect(mockStatusRepo.markSucceeded).toHaveBeenCalled();
    });

    it("returns artifactId", async () => {
      const result = await executor.executeAttempt(createParams());

      expect(result.artifactId).toBe("artifact-123");
    });
  });

  describe("executeAttempt - failure path", () => {
    it("marks attempt as failed when runner fails", async () => {
      mockRunner.run.mockResolvedValue({ exitCode: 1, output: "Error" });

      const result = await executor.executeAttempt(createParams());

      expect(result.status).toBe("failed");
      expect(mockStatusRepo.markFailed).toHaveBeenCalled();
    });

    it("saves error artifact on failure", async () => {
      mockRunner.run.mockResolvedValue({ exitCode: 1, output: "Error" });

      await executor.executeAttempt(createParams());

      expect(mockArtifactStore.save).toHaveBeenCalledWith(
        "attempt-123",
        expect.objectContaining({ kind: "error" })
      );
    });

    it("handles runner throw", async () => {
      mockRunner.run.mockRejectedValue(new Error("Runner crashed"));

      const result = await executor.executeAttempt(createParams());

      expect(result.status).toBe("failed");
      expect(mockStatusRepo.markFailed).toHaveBeenCalledWith(
        "attempt-123",
        expect.any(Date),
        expect.stringContaining("Runner crashed"),
        1
      );
    });
  });

  describe("executeAttempt - timeout path", () => {
    it("marks attempt as failed on timeout", async () => {
      mockRunner.run.mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const result = await executor.executeAttempt(createParams({ timeout: 50 }));

      expect(result.status).toBe("failed");
      expect(mockStatusRepo.markFailed).toHaveBeenCalledWith(
        "attempt-123",
        expect.any(Date),
        expect.stringContaining("timeout"),
        124
      );
    });
  });

  describe("cancelAttempt", () => {
    it("is a no-op for MVP", async () => {
      await expect(executor.cancelAttempt("attempt-123")).resolves.toBeUndefined();
    });
  });
});
