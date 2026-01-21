/** Factory Run Details Dependencies (PR-102) - Real implementations */
import { db } from "@/server/db";
import { factoryRuns, attempts, tasks } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import type { RunDetailsDeps, RunInfo, RunItem, CiStatus, RunItemStatus } from "./factory-run-details.service";
import { getPrCheckStatus } from "./factory-pr-checks.service";
import { createPrChecksDeps } from "./factory-pr-checks-deps";

export function createRunDetailsDeps(): RunDetailsDeps {
  const prChecksDeps = createPrChecksDeps();

  return {
    getRun: async (runId: string): Promise<RunInfo | null> => {
      const row = await db.select().from(factoryRuns).where(eq(factoryRuns.id, runId)).get();
      if (!row) return null;
      return {
        id: row.id,
        projectId: row.projectId,
        status: row.status as RunInfo["status"],
        maxParallel: row.maxParallel,
        startedAt: row.startedAt,
        finishedAt: row.finishedAt,
      };
    },

    getRunItems: async (runId: string): Promise<RunItem[]> => {
      const rows = await db.select({
        attemptId: attempts.id,
        taskId: attempts.taskId,
        attemptStatus: attempts.status,
        branchName: attempts.branchName,
        prUrl: attempts.prUrl,
        headCommit: attempts.headCommit,
        taskTitle: tasks.title,
      })
        .from(attempts)
        .innerJoin(tasks, eq(attempts.taskId, tasks.id))
        .where(eq(attempts.factoryRunId, runId));

      return rows.map((r) => ({
        taskId: r.taskId,
        taskTitle: r.taskTitle,
        attemptId: r.attemptId,
        attemptStatus: normalizeStatus(r.attemptStatus),
        branchName: r.branchName,
        prUrl: r.prUrl,
        headCommit: r.headCommit,
      }));
    },

    getPrCiStatus: async (prUrl: string, commitSha: string): Promise<CiStatus | null> => {
      try {
        const status = await getPrCheckStatus(prChecksDeps, prUrl, commitSha);
        return { status, summary: `CI ${status}` };
      } catch {
        return null;
      }
    },
  };
}

function normalizeStatus(status: string): RunItemStatus {
  if (status === "completed") return "completed";
  if (status === "failed" || status === "stopped") return "failed";
  if (status === "running") return "running";
  return "queued";
}
