/**
 * GitHub Webhook Helpers
 *
 * Responsibility: Helper functions for webhook processing
 *
 * Why separate file:
 * - Keeps webhook route under 200 LOC
 * - Single responsibility: attempt lookup logic
 * - Reusable across different webhook handlers
 */

import { db } from "@/server/db";
import { attempts, tasks, projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Find project by repository URL
 * Tries both with and without .git suffix
 */
export async function findProjectByRepoUrl(repoUrl: string) {
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.gitUrl, repoUrl))
    .get();

  if (project) return project;

  // Try with .git suffix
  const projectWithGit = await db
    .select()
    .from(projects)
    .where(eq(projects.gitUrl, `${repoUrl}.git`))
    .get();

  return projectWithGit || null;
}

/**
 * Find most recent attempt by PR number within a project
 * Returns null if no matching attempt found
 */
export async function findAttemptByPRNumber(
  projectId: string,
  prNumber: number
) {
  // Get all tasks for this project
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .all();

  const taskIds = projectTasks.map(t => t.id);

  // Find all attempts with matching PR number
  let allMatchingAttempts: any[] = [];
  for (const taskId of taskIds) {
    const taskAttempts = await db
      .select()
      .from(attempts)
      .where(eq(attempts.taskId, taskId))
      .all();

    const matching = taskAttempts.filter(a => a.prNumber === prNumber);
    allMatchingAttempts.push(...matching);
  }

  // Sort by startedAt descending and take the most recent
  if (allMatchingAttempts.length === 0) return null;

  allMatchingAttempts.sort((a, b) => {
    const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return bTime - aTime; // Most recent first
  });

  return allMatchingAttempts[0];
}
