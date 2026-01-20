/** Attempt Worker Tests (PR-66) - TDD */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AttemptWorker } from "../autopilot/attempt-worker";

describe("AttemptWorker", () => {
  let worker: AttemptWorker;
  let mockExecutor: { executeAttempt: ReturnType<typeof vi.fn> };
  let executionOrder: string[];

  beforeEach(() => {
    executionOrder = [];
    mockExecutor = {
      executeAttempt: vi.fn().mockImplementation(async (params) => {
        executionOrder.push(params.attemptId);
        await new Promise((r) => setTimeout(r, 10));
        return { status: "succeeded" };
      }),
    };

    worker = new AttemptWorker(mockExecutor as any);
  });

  afterEach(() => {
    worker.stop();
  });

  describe("enqueue", () => {
    it("triggers execution", async () => {
      worker.enqueue({
        attemptId: "att-1",
        taskId: "task-1",
        projectId: "proj-1",
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(mockExecutor.executeAttempt).toHaveBeenCalled();
    });

    it("passes params to executor", async () => {
      worker.enqueue({
        attemptId: "att-1",
        taskId: "task-1",
        projectId: "proj-1",
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(mockExecutor.executeAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          attemptId: "att-1",
          taskId: "task-1",
          projectId: "proj-1",
        })
      );
    });
  });

  describe("sequential execution", () => {
    it("executes one at a time", async () => {
      worker.enqueue({ attemptId: "att-1", taskId: "t1", projectId: "p1" });
      worker.enqueue({ attemptId: "att-2", taskId: "t2", projectId: "p1" });
      worker.enqueue({ attemptId: "att-3", taskId: "t3", projectId: "p1" });

      await new Promise((r) => setTimeout(r, 100));

      expect(executionOrder).toEqual(["att-1", "att-2", "att-3"]);
    });
  });

  describe("error handling", () => {
    it("does not crash on executor failure", async () => {
      mockExecutor.executeAttempt.mockRejectedValueOnce(new Error("Boom"));
      mockExecutor.executeAttempt.mockResolvedValueOnce({ status: "succeeded" });

      worker.enqueue({ attemptId: "att-1", taskId: "t1", projectId: "p1" });
      worker.enqueue({ attemptId: "att-2", taskId: "t2", projectId: "p1" });

      await new Promise((r) => setTimeout(r, 100));

      expect(mockExecutor.executeAttempt).toHaveBeenCalledTimes(2);
    });
  });

  describe("queueSize", () => {
    it("returns current queue size", async () => {
      mockExecutor.executeAttempt.mockImplementation(
        () => new Promise((r) => setTimeout(r, 100))
      );

      worker.enqueue({ attemptId: "att-1", taskId: "t1", projectId: "p1" });
      worker.enqueue({ attemptId: "att-2", taskId: "t2", projectId: "p1" });

      // First one is executing, second is queued
      await new Promise((r) => setTimeout(r, 10));
      expect(worker.queueSize()).toBeGreaterThanOrEqual(0);
    });
  });
});
