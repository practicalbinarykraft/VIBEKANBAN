/** Autopilot Readiness Service (PR-81) - Pure read-only diagnostic checks */
import { db } from "@/server/db";
import { tasks } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getDerivedAutopilotStatus } from "./derived-autopilot-status.service";
import { getAiStatus } from "@/server/services/ai/ai-status";
import { checkRepoReady } from "@/lib/autopilot-safety";

export type AutopilotBlocker =
  | { type: "NO_TASKS" }
  | { type: "AI_NOT_CONFIGURED" }
  | { type: "BUDGET_EXCEEDED"; limitUSD: number; spendUSD: number }
  | { type: "AUTOPILOT_RUNNING" }
  | { type: "REPO_NOT_READY" };

export interface AutopilotReadiness {
  ready: boolean;
  blockers: AutopilotBlocker[];
}

/**
 * Get autopilot readiness for a project (pure read-only, no side effects)
 */
export async function getAutopilotReadiness(projectId: string): Promise<AutopilotReadiness> {
  const blockers: AutopilotBlocker[] = [];

  // 1. Check if autopilot is already running
  const autopilotStatus = await getDerivedAutopilotStatus(projectId);
  if (autopilotStatus.status === "RUNNING") {
    blockers.push({ type: "AUTOPILOT_RUNNING" });
  }

  // 2. Check for tasks ready to run (todo or in_progress)
  const readyTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), inArray(tasks.status, ["todo", "in_progress"])));
  if (readyTasks.length === 0) {
    blockers.push({ type: "NO_TASKS" });
  }

  // 3. Check AI configuration and budget
  const aiStatus = await getAiStatus();
  if (!aiStatus.realAiEligible) {
    if (aiStatus.reason === "BUDGET_LIMIT_EXCEEDED" && aiStatus.limitUSD && aiStatus.spendUSD) {
      blockers.push({ type: "BUDGET_EXCEEDED", limitUSD: aiStatus.limitUSD, spendUSD: aiStatus.spendUSD });
    } else {
      blockers.push({ type: "AI_NOT_CONFIGURED" });
    }
  }

  // 4. Check repo readiness
  const repoCheck = await checkRepoReady(projectId);
  if (!repoCheck.ok) {
    blockers.push({ type: "REPO_NOT_READY" });
  }

  return { ready: blockers.length === 0, blockers };
}
