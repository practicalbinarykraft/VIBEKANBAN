/**
 * SimpleRunner Tests (PR-60)
 * TDD for simple attempt execution without Docker/Git
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { db, initDB } from "@/server/db";
import { tasks, attempts, logs, artifacts, projects } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { runSimpleAttempt } from "../execution/simple-runner";

const TEST_PROJECT_ID = "test-project-simple";
const TEST_TASK_ID = "test-task-simple";

describe("SimpleRunner", () => {
  beforeAll(() => {
    initDB();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.delete(logs).where(eq(logs.attemptId, TEST_TASK_ID));
    await db.delete(artifacts).where(eq(artifacts.attemptId, TEST_TASK_ID));
    await db.delete(attempts).where(eq(attempts.taskId, TEST_TASK_ID));
    await db.delete(tasks).where(eq(tasks.id, TEST_TASK_ID));
    await db.delete(projects).where(eq(projects.id, TEST_PROJECT_ID));

    // Create test project
    await db.insert(projects).values({
      id: TEST_PROJECT_ID,
      name: "Test Project",
      gitUrl: "https://github.com/test/test.git",
    });

    // Create test task
    await db.insert(tasks).values({
      id: TEST_TASK_ID,
      projectId: TEST_PROJECT_ID,
      title: "Test Task",
      description: "Test description",
      status: "todo",
      order: 0,
    });
  });

  afterEach(async () => {
    // Clean up logs first (FK constraint)
    const testAttempts = await db.select({ id: attempts.id })
      .from(attempts)
      .where(eq(attempts.taskId, TEST_TASK_ID));

    for (const att of testAttempts) {
      await db.delete(logs).where(eq(logs.attemptId, att.id));
      await db.delete(artifacts).where(eq(artifacts.attemptId, att.id));
    }
    await db.delete(attempts).where(eq(attempts.taskId, TEST_TASK_ID));
  });

  describe("runSimpleAttempt() - success path", () => {
    it("creates attempt and executes command successfully", async () => {
      const result = await runSimpleAttempt({
        taskId: TEST_TASK_ID,
        projectId: TEST_PROJECT_ID,
        command: ["node", "-e", "console.log('ok')"],
      });

      expect(result.success).toBe(true);
      expect(result.attemptId).toBeDefined();
      expect(result.exitCode).toBe(0);
    });

    it("sets attempt status to completed on success", async () => {
      const result = await runSimpleAttempt({
        taskId: TEST_TASK_ID,
        projectId: TEST_PROJECT_ID,
        command: ["node", "-e", "console.log('ok')"],
      });

      const attempt = await db.select()
        .from(attempts)
        .where(eq(attempts.id, result.attemptId!))
        .get();

      expect(attempt?.status).toBe("completed");
      expect(attempt?.exitCode).toBe(0);
      expect(attempt?.finishedAt).toBeDefined();
    });

    it("stores logs in database", async () => {
      const result = await runSimpleAttempt({
        taskId: TEST_TASK_ID,
        projectId: TEST_PROJECT_ID,
        command: ["node", "-e", "console.log('hello-test-123')"],
      });

      const storedLogs = await db.select()
        .from(logs)
        .where(eq(logs.attemptId, result.attemptId!));

      expect(storedLogs.length).toBeGreaterThan(0);
      expect(storedLogs.some((l) => l.message.includes("hello-test-123"))).toBe(true);
    });

    it("stores execution summary as artifact", async () => {
      const result = await runSimpleAttempt({
        taskId: TEST_TASK_ID,
        projectId: TEST_PROJECT_ID,
        command: ["node", "-e", "console.log('done')"],
      });

      const storedArtifacts = await db.select()
        .from(artifacts)
        .where(eq(artifacts.attemptId, result.attemptId!));

      expect(storedArtifacts.length).toBeGreaterThan(0);
      expect(storedArtifacts.some((a) => a.type === "summary")).toBe(true);
    });
  });

  describe("runSimpleAttempt() - failure path", () => {
    it("sets attempt status to failed on command failure", async () => {
      const result = await runSimpleAttempt({
        taskId: TEST_TASK_ID,
        projectId: TEST_PROJECT_ID,
        command: ["node", "-e", "process.exit(1)"],
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);

      const attempt = await db.select()
        .from(attempts)
        .where(eq(attempts.id, result.attemptId!))
        .get();

      expect(attempt?.status).toBe("failed");
      expect(attempt?.exitCode).toBe(1);
    });

    it("captures stderr in logs", async () => {
      const result = await runSimpleAttempt({
        taskId: TEST_TASK_ID,
        projectId: TEST_PROJECT_ID,
        command: ["node", "-e", "console.error('error-msg-456')"],
      });

      const storedLogs = await db.select()
        .from(logs)
        .where(eq(logs.attemptId, result.attemptId!));

      expect(storedLogs.some((l) => l.message.includes("error-msg-456"))).toBe(true);
      expect(storedLogs.some((l) => l.level === "error")).toBe(true);
    });
  });

  describe("runSimpleAttempt() - timestamps", () => {
    it("records startedAt and finishedAt", async () => {
      const result = await runSimpleAttempt({
        taskId: TEST_TASK_ID,
        projectId: TEST_PROJECT_ID,
        command: ["node", "-e", "console.log('ok')"],
      });

      const attempt = await db.select()
        .from(attempts)
        .where(eq(attempts.id, result.attemptId!))
        .get();

      // Verify timestamps exist and are valid dates
      expect(attempt!.startedAt).toBeDefined();
      expect(attempt!.finishedAt).toBeDefined();
      expect(new Date(attempt!.startedAt).getTime()).toBeGreaterThan(0);
      expect(new Date(attempt!.finishedAt!).getTime()).toBeGreaterThan(0);
      // finishedAt should be >= startedAt
      expect(new Date(attempt!.finishedAt!).getTime()).toBeGreaterThanOrEqual(
        new Date(attempt!.startedAt).getTime()
      );
    });
  });
});
