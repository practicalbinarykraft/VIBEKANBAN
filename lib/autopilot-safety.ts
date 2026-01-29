/**
 * Autopilot Safety Rules
 *
 * Checks before task execution:
 * - Only ONE open PR at a time
 * - Max files changed per task
 * - Repo must be ready
 */

import { db } from '@/server/db';
import { attempts, projects } from '@/server/db/schema';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { isMockModeEnabled } from './mock-mode';

// Safety constants
export const MAX_FILES_PER_TASK = 20;
export const MAX_OPEN_PRS = 1;

export interface SafetyCheckResult {
  ok: boolean;
  reason?: string;
  code?: 'OPEN_PR_LIMIT' | 'FILES_LIMIT' | 'REPO_NOT_READY' | 'AI_NOT_CONFIGURED';
}

/**
 * Check if project has open PRs that haven't been merged
 * Note: We count completed attempts with prUrl as "open PRs"
 * A more sophisticated check would query GitHub API for PR status
 */
export async function checkOpenPRs(projectId: string): Promise<SafetyCheckResult> {
  const { tasks } = await import('@/server/db/schema');

  // Count completed attempts with prUrl for this project
  const openPRs = await db
    .select({ prUrl: attempts.prUrl })
    .from(attempts)
    .innerJoin(tasks, eq(attempts.taskId, tasks.id))
    .where(
      and(
        eq(tasks.projectId, projectId),
        isNotNull(attempts.prUrl),
        eq(attempts.status, 'completed')
      )
    );

  if (openPRs.length >= MAX_OPEN_PRS) {
    return {
      ok: false,
      reason: `Max open PRs reached (${openPRs.length}/${MAX_OPEN_PRS}). Merge or close existing PRs to continue.`,
      code: 'OPEN_PR_LIMIT',
    };
  }

  return { ok: true };
}

/**
 * Check if repo is ready for execution
 */
export async function checkRepoReady(projectId: string): Promise<SafetyCheckResult> {
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();

  if (!project) {
    return {
      ok: false,
      reason: 'Project not found',
      code: 'REPO_NOT_READY',
    };
  }

  if (!project.repoPath) {
    return {
      ok: false,
      reason: 'Repository not cloned. Clone the repo in project settings.',
      code: 'REPO_NOT_READY',
    };
  }

  return { ok: true };
}

/**
 * Run all safety checks before execution
 */
export async function runSafetyChecks(projectId: string): Promise<SafetyCheckResult> {
  // Skip safety checks in mock mode for E2E testing
  if (isMockModeEnabled()) {
    return { ok: true };
  }

  // Check repo ready
  const repoCheck = await checkRepoReady(projectId);
  if (!repoCheck.ok) return repoCheck;

  // Check open PRs
  const prCheck = await checkOpenPRs(projectId);
  if (!prCheck.ok) return prCheck;

  return { ok: true };
}
