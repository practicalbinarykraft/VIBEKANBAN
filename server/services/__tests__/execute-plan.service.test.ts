/**
 * Unit tests for execute-plan.service
 *
 * Tests:
 * - getExecutionMode returns correct mode for env combos
 * - isExecutePlanV2Enabled flag detection
 * - executePlan fails when plan not found
 * - executePlan fails when status not 'approved'
 * - executePlan creates tasks and attempts from approved plan
 * - IDEMPOTENCY: second call returns same IDs, no duplicates
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { db, initDB } from "@/server/db";
import { projects, councilThreads, planArtifacts, tasks, attempts } from "@/server/db/schema";
import { eq, like, and } from "drizzle-orm";
import {
  executePlan,
  getExecutionMode,
  isExecutePlanV2Enabled,
} from "../execute-plan.service";

// Mock external dependencies
vi.mock("../attempt-runner", () => ({
  runAttempt: vi.fn(),
}));

vi.mock("../events-hub", () => ({
  emitAttemptStatus: vi.fn(),
}));

describe("execute-plan.service", () => {
  const testProjectId = "test-project-exec";
  const testThreadId = "test-thread-exec";

  beforeAll(async () => {
    initDB();
    // Create test project
    try {
      await db.insert(projects).values({
        id: testProjectId,
        name: "Test Project Exec",
        gitUrl: "https://example.com/test-exec",
        defaultBranch: "main",
      });
    } catch {
      // May exist
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    const testTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, testProjectId))
      .all();

    for (const task of testTasks) {
      await db.delete(attempts).where(eq(attempts.taskId, task.id));
    }
    await db.delete(tasks).where(eq(tasks.projectId, testProjectId));
    await db.delete(planArtifacts).where(like(planArtifacts.id, "test-plan-%"));
    await db.delete(councilThreads).where(like(councilThreads.id, "test-thread-%"));

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore env vars
    delete process.env.EXECUTION_MODE;
    delete process.env.FEATURE_EXECUTE_PLAN_V2;
  });

  describe("getExecutionMode", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("returns mock when EXECUTION_MODE=mock", () => {
      process.env.EXECUTION_MODE = "mock";
      expect(getExecutionMode()).toBe("mock");
    });

    it("returns real when EXECUTION_MODE=real", () => {
      process.env.EXECUTION_MODE = "real";
      delete process.env.PLAYWRIGHT;
      expect(getExecutionMode()).toBe("real");
    });

    it("returns mock when PLAYWRIGHT=1", () => {
      delete process.env.EXECUTION_MODE;
      process.env.PLAYWRIGHT = "1";
      expect(getExecutionMode()).toBe("mock");
    });

    it("returns mock when NODE_ENV=test", () => {
      delete process.env.EXECUTION_MODE;
      delete process.env.PLAYWRIGHT;
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      expect(getExecutionMode()).toBe("mock");
    });
  });

  describe("isExecutePlanV2Enabled", () => {
    it("returns false when not set", () => {
      delete process.env.FEATURE_EXECUTE_PLAN_V2;
      expect(isExecutePlanV2Enabled()).toBe(false);
    });

    it("returns true when set to 1", () => {
      process.env.FEATURE_EXECUTE_PLAN_V2 = "1";
      expect(isExecutePlanV2Enabled()).toBe(true);
    });

    it("returns false when set to other value", () => {
      process.env.FEATURE_EXECUTE_PLAN_V2 = "true";
      expect(isExecutePlanV2Enabled()).toBe(false);
    });
  });

  describe("executePlan", () => {
    it("fails when plan not found", async () => {
      const result = await executePlan({
        planId: "non-existent-plan",
        projectId: testProjectId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Plan not found");
    });

    it("fails when plan status is draft", async () => {
      // Create thread
      await db.insert(councilThreads).values({
        id: testThreadId,
        projectId: testProjectId,
        iterationNumber: 1,
        status: "discussing",
      });

      // Create draft plan
      await db.insert(planArtifacts).values({
        id: "test-plan-draft",
        threadId: testThreadId,
        version: 1,
        status: "draft",
        summary: "Test plan",
        scope: "Test scope",
        tasks: JSON.stringify([{ title: "Task 1", description: "Do thing", type: "backend", estimate: "S" }]),
        taskCount: 1,
        estimate: "S",
      });

      const result = await executePlan({
        planId: "test-plan-draft",
        projectId: testProjectId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("draft");
      expect(result.error).toContain("expected 'approved'");
    });

    it("fails when plan status is revised", async () => {
      await db.insert(councilThreads).values({
        id: "test-thread-revised",
        projectId: testProjectId,
        iterationNumber: 1,
        status: "plan_ready",
      });

      await db.insert(planArtifacts).values({
        id: "test-plan-revised",
        threadId: "test-thread-revised",
        version: 2,
        status: "revised",
        summary: "Revised plan",
        scope: "Test scope",
        tasks: JSON.stringify([{ title: "Task 1", description: "Do thing", type: "backend", estimate: "S" }]),
        taskCount: 1,
        estimate: "S",
      });

      const result = await executePlan({
        planId: "test-plan-revised",
        projectId: testProjectId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("revised");
    });

    it("creates tasks and attempts from approved plan", async () => {
      process.env.EXECUTION_MODE = "mock";

      await db.insert(councilThreads).values({
        id: "test-thread-approved",
        projectId: testProjectId,
        iterationNumber: 1,
        status: "approved",
      });

      const planTasks = [
        { title: "Task 1", description: "Do thing 1", type: "backend", estimate: "S" },
        { title: "Task 2", description: "Do thing 2", type: "frontend", estimate: "M" },
      ];

      await db.insert(planArtifacts).values({
        id: "test-plan-approved",
        threadId: "test-thread-approved",
        version: 1,
        status: "approved",
        summary: "Approved plan",
        scope: "Test scope",
        tasks: JSON.stringify(planTasks),
        taskCount: 2,
        estimate: "M",
      });

      const result = await executePlan({
        planId: "test-plan-approved",
        projectId: testProjectId,
      });

      expect(result.success).toBe(true);
      expect(result.createdTaskIds).toHaveLength(2);
      expect(result.attemptIds).toHaveLength(2);
      expect(result.alreadyExecuted).toBeUndefined();

      // Verify plan status changed to completed
      const updatedPlan = await db
        .select()
        .from(planArtifacts)
        .where(eq(planArtifacts.id, "test-plan-approved"))
        .get();
      expect(updatedPlan?.status).toBe("completed");

      // Verify tasks have stable keys
      const createdTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, testProjectId))
        .all();

      expect(createdTasks).toHaveLength(2);
      expect(createdTasks[0].description).toContain("[plan:test-plan-approved:idx:0]");
      expect(createdTasks[1].description).toContain("[plan:test-plan-approved:idx:1]");
    });

    it("is idempotent - second call returns same IDs without duplicates", async () => {
      process.env.EXECUTION_MODE = "mock";

      await db.insert(councilThreads).values({
        id: "test-thread-idempotent",
        projectId: testProjectId,
        iterationNumber: 1,
        status: "approved",
      });

      await db.insert(planArtifacts).values({
        id: "test-plan-idempotent",
        threadId: "test-thread-idempotent",
        version: 1,
        status: "approved",
        summary: "Idempotent plan",
        scope: "Test scope",
        tasks: JSON.stringify([
          { title: "Task A", description: "Do A", type: "backend", estimate: "S" },
        ]),
        taskCount: 1,
        estimate: "S",
      });

      // First call
      const result1 = await executePlan({
        planId: "test-plan-idempotent",
        projectId: testProjectId,
      });

      expect(result1.success).toBe(true);
      expect(result1.createdTaskIds).toHaveLength(1);
      expect(result1.alreadyExecuted).toBeUndefined();

      // Second call - should be idempotent
      const result2 = await executePlan({
        planId: "test-plan-idempotent",
        projectId: testProjectId,
      });

      expect(result2.success).toBe(true);
      expect(result2.alreadyExecuted).toBe(true);
      expect(result2.createdTaskIds).toEqual(result1.createdTaskIds);
      expect(result2.attemptIds).toEqual(result1.attemptIds);

      // Verify no duplicates in DB
      const allTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, testProjectId),
            like(tasks.description, "%[plan:test-plan-idempotent%")
          )
        )
        .all();

      expect(allTasks).toHaveLength(1);
    });

    it("returns alreadyExecuted=true for executing status", async () => {
      process.env.EXECUTION_MODE = "mock";

      await db.insert(councilThreads).values({
        id: "test-thread-executing",
        projectId: testProjectId,
        iterationNumber: 1,
        status: "approved",
      });

      await db.insert(planArtifacts).values({
        id: "test-plan-executing",
        threadId: "test-thread-executing",
        version: 1,
        status: "executing",
        summary: "Executing plan",
        scope: "Test scope",
        tasks: JSON.stringify([
          { title: "Task X", description: "Do X", type: "backend", estimate: "S" },
        ]),
        taskCount: 1,
        estimate: "S",
      });

      const result = await executePlan({
        planId: "test-plan-executing",
        projectId: testProjectId,
      });

      expect(result.success).toBe(true);
      expect(result.alreadyExecuted).toBe(true);
    });
  });
});
