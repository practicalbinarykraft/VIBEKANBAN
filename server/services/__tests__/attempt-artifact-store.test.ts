/** Attempt Artifact Store Tests (PR-66) - TDD */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/server/db";
import { projects, tasks, attempts, artifacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { AttemptArtifactStore } from "../autopilot/attempt-artifact-store";

describe("AttemptArtifactStore", () => {
  let projectId: string;
  let taskId: string;
  let attemptId: string;
  let store: AttemptArtifactStore;
  let createdArtifactIds: string[] = [];

  beforeEach(async () => {
    projectId = randomUUID();
    taskId = randomUUID();
    attemptId = randomUUID();
    createdArtifactIds = [];

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

    store = new AttemptArtifactStore();
  });

  afterEach(async () => {
    for (const id of createdArtifactIds) {
      await db.delete(artifacts).where(eq(artifacts.id, id));
    }
    await db.delete(attempts).where(eq(attempts.taskId, taskId));
    await db.delete(tasks).where(eq(tasks.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
  });

  describe("save", () => {
    it("saves artifact and returns id", async () => {
      const result = await store.save(attemptId, {
        kind: "runner_output",
        data: { exitCode: 0, output: "Success" },
      });

      createdArtifactIds.push(result.artifactId);
      expect(result.artifactId).toBeDefined();
    });

    it("saves artifact with correct type", async () => {
      const result = await store.save(attemptId, {
        kind: "error",
        data: { message: "Failed" },
      });

      createdArtifactIds.push(result.artifactId);
      const artifact = await store.get(result.artifactId);
      expect(artifact?.kind).toBe("error");
    });
  });

  describe("get", () => {
    it("returns null for non-existent artifact", async () => {
      const result = await store.get("non-existent");
      expect(result).toBeNull();
    });

    it("retrieves saved artifact", async () => {
      const payload = { kind: "runner_output" as const, data: { test: "value" } };
      const { artifactId } = await store.save(attemptId, payload);
      createdArtifactIds.push(artifactId);

      const result = await store.get(artifactId);
      expect(result).not.toBeNull();
      expect(result?.data.test).toBe("value");
    });

    it("parses JSON content correctly", async () => {
      const payload = {
        kind: "runner_output" as const,
        data: { nested: { value: 123 }, array: [1, 2, 3] },
      };
      const { artifactId } = await store.save(attemptId, payload);
      createdArtifactIds.push(artifactId);

      const result = await store.get(artifactId);
      const nested = result?.data.nested as { value: number };
      expect(nested.value).toBe(123);
      expect(result?.data.array).toEqual([1, 2, 3]);
    });
  });
});
