/** Attempt Log Sink Tests (PR-66) - TDD */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/server/db";
import { projects, tasks, attempts, logs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { AttemptLogSink } from "../autopilot/attempt-log-sink";

describe("AttemptLogSink", () => {
  let projectId: string;
  let taskId: string;
  let attemptId: string;
  let logSink: AttemptLogSink;

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
      status: "running",
    });

    logSink = new AttemptLogSink();
  });

  afterEach(async () => {
    await db.delete(logs).where(eq(logs.attemptId, attemptId));
    await db.delete(attempts).where(eq(attempts.taskId, taskId));
    await db.delete(tasks).where(eq(tasks.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
  });

  describe("append", () => {
    it("appends a log line", async () => {
      await logSink.append(attemptId, "info", "Test log message");

      const result = await logSink.list(attemptId);
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].message).toBe("Test log message");
    });

    it("appends multiple lines in order", async () => {
      await logSink.append(attemptId, "info", "Line 1");
      await logSink.append(attemptId, "info", "Line 2");
      await logSink.append(attemptId, "error", "Line 3");

      const result = await logSink.list(attemptId);
      expect(result.lines).toHaveLength(3);
      expect(result.lines[0].message).toBe("Line 1");
      expect(result.lines[2].level).toBe("error");
    });
  });

  describe("list", () => {
    it("returns empty array for no logs", async () => {
      const result = await logSink.list(attemptId);
      expect(result.lines).toEqual([]);
    });

    it("respects limit parameter", async () => {
      for (let i = 0; i < 10; i++) {
        await logSink.append(attemptId, "info", `Line ${i}`);
      }

      const result = await logSink.list(attemptId, 5);
      expect(result.lines).toHaveLength(5);
    });

    it("supports cursor pagination", async () => {
      for (let i = 0; i < 10; i++) {
        await logSink.append(attemptId, "info", `Line ${i}`);
      }

      const page1 = await logSink.list(attemptId, 5, 0);
      expect(page1.lines).toHaveLength(5);
      expect(page1.nextCursor).toBe(5);

      const page2 = await logSink.list(attemptId, 5, page1.nextCursor);
      expect(page2.lines).toHaveLength(5);
    });
  });
});
