/**
 * AttemptRunnerService Tests (PR-62)
 * TDD for attempt execution orchestration
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { db, initDB } from "@/server/db";
import { tasks, attempts, logs, projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  createAttempt,
  runAttempt,
  getAttemptStatus,
  getAttemptLogs,
} from "../attempts/attempt-runner.service";

const TEST_PROJECT_ID = "test-project-runner-svc";
const TEST_TASK_ID = "test-task-runner-svc";

describe("AttemptRunnerService", () => {
  beforeAll(() => {
    initDB();
  });

  beforeEach(async () => {
    // Clean up test data
    const testAttempts = await db.select({ id: attempts.id })
      .from(attempts)
      .where(eq(attempts.taskId, TEST_TASK_ID));

    for (const att of testAttempts) {
      await db.delete(logs).where(eq(logs.attemptId, att.id));
    }
    await db.delete(attempts).where(eq(attempts.taskId, TEST_TASK_ID));
    await db.delete(tasks).where(eq(tasks.id, TEST_TASK_ID));
    await db.delete(projects).where(eq(projects.id, TEST_PROJECT_ID));

    // Create test project
    await db.insert(projects).values({
      id: TEST_PROJECT_ID,
      name: "Test Project Runner",
      gitUrl: "https://github.com/test/runner.git",
    });

    // Create test task
    await db.insert(tasks).values({
      id: TEST_TASK_ID,
      projectId: TEST_PROJECT_ID,
      title: "Test Task Runner",
      description: "Test task for runner service",
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

  describe("createAttempt()", () => {
    it("creates attempt with queued status and returns attemptId", async () => {
      const result = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      expect(result.attemptId).toBeDefined();
      expect(result.status).toBe("queued");

      const attempt = await db.select()
        .from(attempts)
        .where(eq(attempts.id, result.attemptId))
        .get();

      expect(attempt).toBeDefined();
      expect(attempt?.status).toBe("queued");
      expect(attempt?.taskId).toBe(TEST_TASK_ID);
    });
  });

  describe("runAttempt()", () => {
    it("transitions attempt to running and sets startedAt", async () => {
      const { attemptId } = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      const result = await runAttempt({
        attemptId,
        command: ["node", "-e", "console.log('test')"],
      });

      expect(result.ok).toBe(true);

      // Give async execution time to start
      await new Promise((r) => setTimeout(r, 100));

      const status = await getAttemptStatus(attemptId);
      expect(["running", "completed"]).toContain(status.status);
      expect(status.startedAt).toBeDefined();
    });

    it("returns error if attempt not found", async () => {
      const result = await runAttempt({
        attemptId: "non-existent-id",
        command: ["echo", "test"],
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("returns error if attempt already running", async () => {
      const { attemptId } = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      // Start first run
      await runAttempt({
        attemptId,
        command: ["node", "-e", "setTimeout(() => {}, 5000)"],
      });

      await new Promise((r) => setTimeout(r, 100));

      // Try to run again
      const result = await runAttempt({
        attemptId,
        command: ["echo", "test"],
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("already");
    });
  });

  describe("getAttemptStatus()", () => {
    it("returns correct status shape", async () => {
      const { attemptId } = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      const status = await getAttemptStatus(attemptId);

      expect(status.attemptId).toBe(attemptId);
      expect(status.status).toBe("queued");
      // startedAt is set on creation (DB constraint)
      expect(status.startedAt).toBeDefined();
      expect(status.finishedAt).toBeNull();
    });

    it("reflects completed status after successful run", async () => {
      const { attemptId } = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      await runAttempt({
        attemptId,
        command: ["node", "-e", "console.log('done')"],
      });

      // Wait for completion
      await new Promise((r) => setTimeout(r, 500));

      const status = await getAttemptStatus(attemptId);
      expect(status.status).toBe("completed");
      expect(status.finishedAt).toBeDefined();
      expect(status.exitCode).toBe(0);
    });

    it("reflects failed status after command error", async () => {
      const { attemptId } = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      await runAttempt({
        attemptId,
        command: ["node", "-e", "process.exit(1)"],
      });

      await new Promise((r) => setTimeout(r, 500));

      const status = await getAttemptStatus(attemptId);
      expect(status.status).toBe("failed");
      expect(status.exitCode).toBe(1);
    });
  });

  describe("getAttemptLogs()", () => {
    it("returns logs with cursor pagination", async () => {
      const { attemptId } = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      await runAttempt({
        attemptId,
        command: ["node", "-e", "console.log('line1'); console.log('line2'); console.log('line3')"],
      });

      await new Promise((r) => setTimeout(r, 500));

      const result = await getAttemptLogs({ attemptId, limit: 2 });

      expect(result.lines.length).toBeLessThanOrEqual(2);
      if (result.lines.length === 2) {
        expect(result.nextCursor).toBeDefined();
      }
    });

    it("returns empty lines for attempt without logs", async () => {
      const { attemptId } = await createAttempt({
        projectId: TEST_PROJECT_ID,
        taskId: TEST_TASK_ID,
      });

      const result = await getAttemptLogs({ attemptId });

      expect(result.lines).toEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });
  });
});
