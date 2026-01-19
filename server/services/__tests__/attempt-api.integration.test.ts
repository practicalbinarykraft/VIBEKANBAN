/**
 * Attempt API Integration Tests (PR-62)
 * Tests API route handlers for attempt CRUD operations
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { db, initDB } from "@/server/db";
import { tasks, attempts, logs, projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  createAttempt,
  runAttempt,
  getAttemptStatus,
  getAttemptLogs,
} from "../attempts/attempt-runner.service";

const TEST_PROJECT_ID = "test-project-api-int";
const TEST_TASK_ID = "test-task-api-int";

/**
 * These tests verify the service layer that API routes will call.
 * API routes are thin wrappers that parse requests and call these functions.
 */
describe("Attempt API Integration", () => {
  beforeAll(() => {
    initDB();
  });

  beforeEach(async () => {
    // Clean up
    const testAttempts = await db.select({ id: attempts.id })
      .from(attempts)
      .where(eq(attempts.taskId, TEST_TASK_ID));

    for (const att of testAttempts) {
      await db.delete(logs).where(eq(logs.attemptId, att.id));
    }
    await db.delete(attempts).where(eq(attempts.taskId, TEST_TASK_ID));
    await db.delete(tasks).where(eq(tasks.id, TEST_TASK_ID));
    await db.delete(projects).where(eq(projects.id, TEST_PROJECT_ID));

    // Create test data
    await db.insert(projects).values({
      id: TEST_PROJECT_ID,
      name: "API Test Project",
      gitUrl: "https://github.com/test/api.git",
    });

    await db.insert(tasks).values({
      id: TEST_TASK_ID,
      projectId: TEST_PROJECT_ID,
      title: "API Test Task",
      description: "Task for API testing",
      status: "todo",
      order: 0,
    });
  });

  afterEach(async () => {
    const testAttempts = await db.select({ id: attempts.id })
      .from(attempts)
      .where(eq(attempts.taskId, TEST_TASK_ID));

    for (const att of testAttempts) {
      await db.delete(logs).where(eq(logs.attemptId, att.id));
    }
    await db.delete(attempts).where(eq(attempts.taskId, TEST_TASK_ID));
  });

  describe("POST /api/projects/[id]/attempts - createAttempt", () => {
    it("returns attemptId on success", async () => {
      const result = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      expect(result.attemptId).toBeDefined();
      expect(typeof result.attemptId).toBe("string");
      expect(result.status).toBe("queued");
    });
  });

  describe("POST /api/projects/[id]/attempts/[attemptId]/run - runAttempt", () => {
    it("returns ok:true on valid attempt", async () => {
      const { attemptId } = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      const result = await runAttempt({
        attemptId,
        command: ["node", "-e", "console.log('api-test')"],
      });

      expect(result.ok).toBe(true);
    });

    it("returns ok:false with error for non-existent attempt", async () => {
      const result = await runAttempt({
        attemptId: "non-existent-attempt-id",
        command: ["echo", "test"],
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("GET /api/projects/[id]/attempts/[attemptId] - getAttemptStatus", () => {
    it("returns correct status structure", async () => {
      const { attemptId } = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      const status = await getAttemptStatus(attemptId);

      expect(status).toMatchObject({
        attemptId,
        status: "queued",
      });
      expect(status.startedAt).toBeDefined();
      expect(status.finishedAt).toBeNull();
    });
  });

  describe("GET /api/projects/[id]/attempts/[attemptId]/logs - getAttemptLogs", () => {
    it("returns empty logs for new attempt", async () => {
      const { attemptId } = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      const result = await getAttemptLogs({ attemptId });

      expect(result.lines).toEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });

    it("returns logs after execution", async () => {
      const { attemptId } = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      await runAttempt({
        attemptId,
        command: ["node", "-e", "console.log('log-line-1')"],
      });

      // Wait for execution
      await new Promise((r) => setTimeout(r, 500));

      const result = await getAttemptLogs({ attemptId });

      expect(result.lines.length).toBeGreaterThan(0);
      expect(result.lines.some((l) => l.message.includes("log-line-1"))).toBe(true);
    });

    it("supports cursor pagination", async () => {
      const { attemptId } = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      await runAttempt({
        attemptId,
        command: ["node", "-e", "for(let i=0;i<5;i++)console.log('line'+i)"],
      });

      await new Promise((r) => setTimeout(r, 500));

      // Get first 2 lines
      const first = await getAttemptLogs({ attemptId, limit: 2 });
      expect(first.lines.length).toBeLessThanOrEqual(2);

      if (first.nextCursor !== undefined) {
        // Get next batch
        const second = await getAttemptLogs({
          attemptId,
          cursor: first.nextCursor,
          limit: 2,
        });
        expect(second.lines.length).toBeGreaterThan(0);
      }
    });
  });
});
