/** Factory Run Results Service (PR-88) - Get factory run results for dashboard */
import { db } from "@/server/db";
import { autopilotRuns, attempts, tasks, artifacts } from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getGuidanceForError, type ErrorGuidance } from "@/server/services/autopilot/autopilot-error-guidance";
import type { AutopilotErrorCode } from "@/types/autopilot-errors";

export type RunResultStatus = "running" | "completed" | "failed" | "cancelled";

export interface ResultGuidance {
  severity: "info" | "warning" | "critical";
  title: string;
  bullets: string[];
}

export interface ResultItem {
  taskId: string;
  taskTitle: string;
  attemptId?: string;
  attemptStatus?: string;
  prUrl?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  guidance?: ResultGuidance | null;
}

export interface FactoryRunResultsDTO {
  runId: string;
  status: RunResultStatus;
  counts: { total: number; ok: number; failed: number; running: number; queued: number };
  items: ResultItem[];
}

type RunRecord = { id: string; status: string; projectId: string };
type AttemptRecord = { id: string; taskId: string; status: string; prUrl?: string | null; applyError?: string | null; exitCode?: number | null };
type TaskRecord = { id: string; title: string };
type ErrorArtifact = { code: string; message: string } | null;

export interface FactoryRunResultsDeps {
  getRun: (runId: string) => Promise<RunRecord | null>;
  getAttemptsByRunId: (runId: string) => Promise<AttemptRecord[]>;
  getTasksByIds: (ids: string[]) => Promise<TaskRecord[]>;
  getErrorArtifact: (attemptId: string) => Promise<ErrorArtifact>;
}

async function defaultGetRun(runId: string): Promise<RunRecord | null> {
  const row = await db.select().from(autopilotRuns).where(eq(autopilotRuns.id, runId)).get();
  if (!row) return null;
  return { id: row.id, status: row.status, projectId: row.projectId };
}

async function defaultGetAttemptsByRunId(runId: string): Promise<AttemptRecord[]> {
  const rows = await db.select().from(attempts).where(eq(attempts.autopilotRunId, runId));
  return rows.map(r => ({
    id: r.id,
    taskId: r.taskId,
    status: r.status,
    prUrl: r.prUrl,
    applyError: r.applyError,
    exitCode: r.exitCode,
  }));
}

async function defaultGetTasksByIds(ids: string[]): Promise<TaskRecord[]> {
  if (ids.length === 0) return [];
  const rows = await db.select().from(tasks).where(inArray(tasks.id, ids));
  return rows.map(r => ({ id: r.id, title: r.title }));
}

async function defaultGetErrorArtifact(attemptId: string): Promise<ErrorArtifact> {
  const row = await db.select().from(artifacts)
    .where(eq(artifacts.attemptId, attemptId))
    .get();
  if (!row || row.type !== "error") return null;
  try {
    const data = JSON.parse(row.content);
    return { code: data.code || "UNKNOWN", message: data.message || "" };
  } catch {
    return null;
  }
}

const defaultDeps: FactoryRunResultsDeps = {
  getRun: defaultGetRun,
  getAttemptsByRunId: defaultGetAttemptsByRunId,
  getTasksByIds: defaultGetTasksByIds,
  getErrorArtifact: defaultGetErrorArtifact,
};

function mapGuidance(guidance: ErrorGuidance): ResultGuidance {
  return {
    severity: guidance.severity,
    title: guidance.title,
    bullets: guidance.nextSteps,
  };
}

export async function getFactoryRunResults(
  projectId: string,
  runId: string,
  deps: FactoryRunResultsDeps = defaultDeps
): Promise<FactoryRunResultsDTO | null> {
  const run = await deps.getRun(runId);
  if (!run || run.projectId !== projectId) return null;

  const attemptRecords = await deps.getAttemptsByRunId(runId);
  const taskIds = [...new Set(attemptRecords.map(a => a.taskId))];
  const taskRecords = await deps.getTasksByIds(taskIds);
  const taskMap = new Map(taskRecords.map(t => [t.id, t.title]));

  const counts = { total: 0, ok: 0, failed: 0, running: 0, queued: 0 };
  const items: ResultItem[] = [];

  for (const attempt of attemptRecords) {
    counts.total++;
    if (attempt.status === "completed") counts.ok++;
    else if (attempt.status === "failed") counts.failed++;
    else if (attempt.status === "running") counts.running++;
    else if (attempt.status === "queued" || attempt.status === "pending") counts.queued++;

    let errorCode: string | null = null;
    let errorMessage: string | null = null;
    let guidance: ResultGuidance | null = null;

    if (attempt.status === "failed") {
      const artifact = await deps.getErrorArtifact(attempt.id);
      if (artifact) {
        errorCode = artifact.code;
        errorMessage = artifact.message;
      } else {
        errorCode = "UNKNOWN";
        errorMessage = attempt.applyError || `Exit code: ${attempt.exitCode ?? "unknown"}`;
      }
      const g = getGuidanceForError({ code: errorCode as AutopilotErrorCode, message: errorMessage });
      guidance = mapGuidance(g);
    }

    items.push({
      taskId: attempt.taskId,
      taskTitle: taskMap.get(attempt.taskId) || "Unknown Task",
      attemptId: attempt.id,
      attemptStatus: attempt.status,
      prUrl: attempt.prUrl,
      errorCode,
      errorMessage,
      guidance,
    });
  }

  return {
    runId: run.id,
    status: run.status as RunResultStatus,
    counts,
    items,
  };
}
