/** Run History Service Tests (PR-65, PR-73, PR-76) - TDD */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/server/db";
import { projects, tasks, attempts, logs, autopilotRuns } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { listRuns, getRunDetails, getRunErrors } from "../autopilot/run-history.service";

describe("RunHistoryService", () => {
  let projectId: string;
  let runId: string;
  let taskIds: string[];
  let attemptIds: string[];

  beforeEach(async () => {
    projectId = randomUUID();
    runId = randomUUID();

    await db.insert(projects).values({
      id: projectId,
      name: "Test Project",
      gitUrl: "https://github.com/test/test.git",
      executionStatus: "done",
      executionStartedAt: new Date("2026-01-20T10:00:00Z"),
      executionFinishedAt: new Date("2026-01-20T10:05:00Z"),
    });

    // PR-73: Create autopilot run
    await db.insert(autopilotRuns).values({
      id: runId,
      projectId,
      status: "completed",
      startedAt: new Date("2026-01-20T10:00:00Z"),
      finishedAt: new Date("2026-01-20T10:05:00Z"),
    });

    taskIds = [randomUUID(), randomUUID()];
    for (let i = 0; i < taskIds.length; i++) {
      await db.insert(tasks).values({
        id: taskIds[i],
        projectId,
        title: `Task ${i + 1}`,
        description: "Test task",
        status: i === 0 ? "done" : "todo",
      });
    }

    attemptIds = [randomUUID(), randomUUID()];
    await db.insert(attempts).values({
      id: attemptIds[0],
      taskId: taskIds[0],
      startedAt: new Date("2026-01-20T10:00:00Z"),
      finishedAt: new Date("2026-01-20T10:02:00Z"),
      status: "completed",
      exitCode: 0,
      autopilotRunId: runId, // PR-73
    });
    await db.insert(attempts).values({
      id: attemptIds[1],
      taskId: taskIds[1],
      startedAt: new Date("2026-01-20T10:02:00Z"),
      finishedAt: new Date("2026-01-20T10:05:00Z"),
      status: "failed",
      exitCode: 1,
      applyError: "Command failed with exit code 1",
      autopilotRunId: runId, // PR-73
    });
  });

  afterEach(async () => {
    await db.delete(logs).where(eq(logs.attemptId, attemptIds[0]));
    await db.delete(logs).where(eq(logs.attemptId, attemptIds[1]));
    await db.delete(attempts).where(eq(attempts.taskId, taskIds[0]));
    await db.delete(attempts).where(eq(attempts.taskId, taskIds[1]));
    await db.delete(autopilotRuns).where(eq(autopilotRuns.id, runId));
    await db.delete(tasks).where(eq(tasks.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
  });

  describe("listRuns", () => {
    it("returns empty array without crashing for non-existent project", async () => {
      const result = await listRuns("non-existent");
      expect(result.runs).toEqual([]);
    });

    it("returns run summary for existing project", async () => {
      const result = await listRuns(projectId);
      expect(result.runs).toHaveLength(1);
      expect(result.runs[0].projectId).toBe(projectId);
      // PR-76: completed run with failed attempts → derived status "failed"
      expect(result.runs[0].status).toBe("failed");
    });

    it("includes attempt counts in summary", async () => {
      const result = await listRuns(projectId);
      expect(result.runs[0].totalTasks).toBe(2);
      expect(result.runs[0].doneTasks).toBe(1);
      expect(result.runs[0].failedTasks).toBe(1);
    });

    it("returns empty array for project with no runs", async () => {
      const noRunsProjectId = randomUUID();
      await db.insert(projects).values({
        id: noRunsProjectId,
        name: "No Runs Project",
        gitUrl: "https://github.com/test/no-runs.git",
        executionStatus: "idle",
      });

      const result = await listRuns(noRunsProjectId);
      expect(result.runs).toEqual([]);

      await db.delete(projects).where(eq(projects.id, noRunsProjectId));
    });
  });

  describe("getRunDetails", () => {
    it("returns null for non-existent run", async () => {
      const result = await getRunDetails("non-existent");
      expect(result.run).toBeNull();
    });

    it("returns run details with attempts", async () => {
      const result = await getRunDetails(runId);
      expect(result.run).not.toBeNull();
      expect(result.run?.attempts).toBeDefined();
      expect(result.run?.attempts.length).toBe(2);
    });

    it("includes attempt status and exit codes", async () => {
      const result = await getRunDetails(runId);
      const completedAttempt = result.run?.attempts.find(a => a.status === "completed");
      const failedAttempt = result.run?.attempts.find(a => a.status === "failed");

      expect(completedAttempt?.exitCode).toBe(0);
      expect(failedAttempt?.exitCode).toBe(1);
    });

    it("includes task titles in attempts", async () => {
      const result = await getRunDetails(runId);
      expect(result.run?.attempts[0].taskTitle).toBeDefined();
    });
  });

  describe("getRunErrors", () => {
    it("returns empty array for non-existent run", async () => {
      const result = await getRunErrors("non-existent");
      expect(result).toEqual([]);
    });

    it("aggregates errors from failed attempts", async () => {
      const result = await getRunErrors(runId);
      expect(result.length).toBe(1);
      expect(result[0].message).toContain("failed");
    });

    it("includes attemptId in error", async () => {
      const result = await getRunErrors(runId);
      const errorWithAttempt = result.find(e => e.attemptId);
      expect(errorWithAttempt?.attemptId).toBeDefined();
    });
  });
});
