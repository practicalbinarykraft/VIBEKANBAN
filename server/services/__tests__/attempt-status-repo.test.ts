/** Attempt Status Repo Tests (PR-66) - TDD */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/server/db";
import { projects, tasks, attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { AttemptStatusRepo } from "../autopilot/attempt-status-repo";

describe("AttemptStatusRepo", () => {
  let projectId: string;
  let taskId: string;
  let attemptId: string;
  let repo: AttemptStatusRepo;

  beforeEach(async () => {
    projectId = randomUUID();
    taskId = randomUUID();
    attemptId = randomUUID();

    await db.insert(projects).values({
      id: projectId,
      name: "Test Project",
      gitUrl: "https://github.com/test/test.git",
    });

    await db.insert(tasks).values({
      id: taskId,
      projectId,
      title: "Test Task",
      description: "Test",
    });

    await db.insert(attempts).values({
      id: attemptId,
      taskId,
      startedAt: new Date(),
      status: "queued",
    });

    repo = new AttemptStatusRepo();
  });

  afterEach(async () => {
    await db.delete(attempts).where(eq(attempts.taskId, taskId));
    await db.delete(tasks).where(eq(tasks.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
  });

  describe("markRunning", () => {
    it("updates status to running", async () => {
      const startedAt = new Date();
      await repo.markRunning(attemptId, startedAt);

      const attempt = await db.select().from(attempts)
        .where(eq(attempts.id, attemptId)).get();
      expect(attempt?.status).toBe("running");
    });

    it("sets startedAt timestamp", async () => {
      const startedAt = new Date("2026-01-20T10:00:00Z");
      await repo.markRunning(attemptId, startedAt);

      const attempt = await db.select().from(attempts)
        .where(eq(attempts.id, attemptId)).get();
      expect(attempt?.startedAt?.toISOString()).toBe(startedAt.toISOString());
    });
  });

  describe("markSucceeded", () => {
    it("updates status to completed", async () => {
      await repo.markSucceeded(attemptId, new Date(), 0);

      const attempt = await db.select().from(attempts)
        .where(eq(attempts.id, attemptId)).get();
      expect(attempt?.status).toBe("completed");
    });

    it("sets finishedAt and exitCode", async () => {
      const finishedAt = new Date("2026-01-20T10:05:00Z");
      await repo.markSucceeded(attemptId, finishedAt, 0);

      const attempt = await db.select().from(attempts)
        .where(eq(attempts.id, attemptId)).get();
      expect(attempt?.finishedAt?.toISOString()).toBe(finishedAt.toISOString());
      expect(attempt?.exitCode).toBe(0);
    });
  });

  describe("markFailed", () => {
    it("updates status to failed", async () => {
      await repo.markFailed(attemptId, new Date(), "Error message", 1);

      const attempt = await db.select().from(attempts)
        .where(eq(attempts.id, attemptId)).get();
      expect(attempt?.status).toBe("failed");
    });

    it("stores error message", async () => {
      await repo.markFailed(attemptId, new Date(), "Task failed: timeout", 124);

      const attempt = await db.select().from(attempts)
        .where(eq(attempts.id, attemptId)).get();
      expect(attempt?.applyError).toBe("Task failed: timeout");
      expect(attempt?.exitCode).toBe(124);
    });
  });

  describe("markCanceled", () => {
    it("updates status to stopped", async () => {
      await repo.markCanceled(attemptId, new Date());

      const attempt = await db.select().from(attempts)
        .where(eq(attempts.id, attemptId)).get();
      expect(attempt?.status).toBe("stopped");
    });
  });
});
