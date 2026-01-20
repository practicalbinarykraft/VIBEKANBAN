/**
 * AutopilotRunnerService Tests (PR-64)
 * TDD: tests written first
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { db } from "@/server/db";
import { projects, tasks, attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Use vi.hoisted to ensure mock is available before module resolution
const { mockRunSimpleAttempt } = vi.hoisted(() => ({
  mockRunSimpleAttempt: vi.fn().mockResolvedValue({
    success: true,
    attemptId: "mock-attempt-id",
    exitCode: 0,
  }),
}));

vi.mock("@/server/services/execution/simple-runner", () => ({
  runSimpleAttempt: mockRunSimpleAttempt,
}));

// Import after mock setup
import {
  startRun,
  stopRun,
  retryRun,
  getRunStatus,
} from "../autopilot-runner.service";

describe("AutopilotRunnerService", () => {
  let testProjectId: string;
  let testTaskIds: string[];

  beforeEach(async () => {
    testProjectId = randomUUID();
    await db.insert(projects).values({
      id: testProjectId,
      name: "Test Project",
      gitUrl: "https://github.com/test/test.git",
      executionStatus: "idle",
    });

    testTaskIds = [randomUUID(), randomUUID()];
    for (const taskId of testTaskIds) {
      await db.insert(tasks).values({
        id: taskId,
        projectId: testProjectId,
        title: `Task ${taskId}`,
        description: "Test task",
        status: "todo",
      });
    }
  });

  afterEach(async () => {
    for (const taskId of testTaskIds) {
      await db.delete(attempts).where(eq(attempts.taskId, taskId));
    }
    await db.delete(tasks).where(eq(tasks.projectId, testProjectId));
    await db.delete(projects).where(eq(projects.id, testProjectId));
    vi.clearAllMocks();
  });

  describe("getRunStatus", () => {
    it("returns current run status for project", async () => {
      const result = await getRunStatus(testProjectId);
      expect(result.status).toBe("idle");
      expect(result.projectId).toBe(testProjectId);
    });

    it("returns error for non-existent project", async () => {
      const result = await getRunStatus("non-existent");
      expect(result.error).toBeDefined();
    });
  });

  describe("startRun", () => {
    it("starts idle project -> running (happy path)", async () => {
      const result = await startRun(testProjectId);
      expect(result.success).toBe(true);
      expect(result.status).toBe("running");

      const project = await db.select().from(projects)
        .where(eq(projects.id, testProjectId)).get();
      expect(project?.executionStatus).toBe("running");
    });

    it("rejects start if already running (409)", async () => {
      await db.update(projects)
        .set({ executionStatus: "running" })
        .where(eq(projects.id, testProjectId));

      const result = await startRun(testProjectId);
      expect(result.success).toBe(false);
      expect(result.error).toContain("already running");
    });

    it("allows start from stopped status", async () => {
      await db.update(projects)
        .set({ executionStatus: "stopped" })
        .where(eq(projects.id, testProjectId));

      const result = await startRun(testProjectId);
      expect(result.success).toBe(true);
    });

    it("calls runner for tasks", async () => {
      await startRun(testProjectId);
      // Wait for async execution
      await new Promise((r) => setTimeout(r, 150));
      expect(mockRunSimpleAttempt).toHaveBeenCalled();
    });
  });

  describe("stopRun", () => {
    it("stops running project", async () => {
      await db.update(projects)
        .set({ executionStatus: "running" })
        .where(eq(projects.id, testProjectId));

      const result = await stopRun(testProjectId, "user requested");
      expect(result.success).toBe(true);

      const project = await db.select().from(projects)
        .where(eq(projects.id, testProjectId)).get();
      expect(project?.executionStatus).toBe("stopped");
    });

    it("returns error if not running", async () => {
      const result = await stopRun(testProjectId);
      expect(result.success).toBe(false);
      expect(result.error).toContain("not running");
    });
  });

  describe("retryRun", () => {
    it("retries stopped project", async () => {
      await db.update(projects)
        .set({ executionStatus: "stopped" })
        .where(eq(projects.id, testProjectId));

      const result = await retryRun(testProjectId);
      expect(result.success).toBe(true);
      expect(result.status).toBe("running");
    });

    it("retries failed project", async () => {
      await db.update(projects)
        .set({ executionStatus: "failed" })
        .where(eq(projects.id, testProjectId));

      const result = await retryRun(testProjectId);
      expect(result.success).toBe(true);
    });

    it("stops and retries running project", async () => {
      await db.update(projects)
        .set({ executionStatus: "running" })
        .where(eq(projects.id, testProjectId));

      const result = await retryRun(testProjectId);
      expect(result.success).toBe(true);
      expect(result.status).toBe("running");
    });

    it("returns error for non-existent project", async () => {
      const result = await retryRun("non-existent");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
