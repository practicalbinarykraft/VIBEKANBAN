/** Attempt PR Publisher Dependencies (PR-97) - Real implementations */
import { db } from "@/server/db";
import { attempts, artifacts, tasks, projects } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createPullRequest as ghCreatePullRequest } from "./pr-creator";
import {
  publishAttemptPullRequest,
  type AttemptPrPublisherDeps,
  type PublishAttemptPrResult,
} from "./attempt-pr-publisher";

/**
 * Create real deps for PR publisher using database
 */
export function createPublisherDeps(): AttemptPrPublisherDeps {
  return {
    async getAttemptById(attemptId) {
      const attempt = await db.select().from(attempts).where(eq(attempts.id, attemptId)).get();
      if (!attempt) return null;

      // Get task title if available
      let taskTitle: string | null = null;
      if (attempt.taskId) {
        const task = await db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, attempt.taskId)).get();
        taskTitle = task?.title ?? null;
      }

      return {
        id: attempt.id,
        status: attempt.status,
        prUrl: attempt.prUrl,
        branchName: attempt.branchName,
        headCommit: attempt.headCommit,
        taskTitle,
      };
    },

    async hasDiffArtifact(attemptId) {
      const diff = await db
        .select({ id: artifacts.id })
        .from(artifacts)
        .where(and(eq(artifacts.attemptId, attemptId), eq(artifacts.type, "diff")))
        .get();
      return diff !== undefined;
    },

    async createPullRequest(args) {
      const result = await ghCreatePullRequest({
        repoPath: args.repoPath,
        branchName: args.branchName,
        baseBranch: args.baseBranch,
        title: args.title,
        body: args.body,
      });

      if (!result.ok || !result.prUrl) {
        throw new Error(result.error || "PR creation failed");
      }

      return { prUrl: result.prUrl };
    },

    async setAttemptPrUrl(attemptId, prUrl) {
      await db.update(attempts).set({ prUrl }).where(eq(attempts.id, attemptId));
    },

    async getRepoPath(attemptId) {
      const attempt = await db.select({ worktreePath: attempts.worktreePath }).from(attempts).where(eq(attempts.id, attemptId)).get();
      return attempt?.worktreePath ?? null;
    },

    async getBaseBranch(attemptId) {
      const attempt = await db.select({ baseBranch: attempts.baseBranch }).from(attempts).where(eq(attempts.id, attemptId)).get();
      return attempt?.baseBranch ?? "main";
    },
  };
}

/**
 * Try to publish PR for an attempt using real deps.
 * Safe to call - won't throw, just returns result.
 */
export async function tryPublishAttemptPr(attemptId: string): Promise<PublishAttemptPrResult> {
  const deps = createPublisherDeps();
  return publishAttemptPullRequest(deps, attemptId);
}

/**
 * Store PR publish result as artifact (for debugging/logging)
 */
export async function storePublishResult(attemptId: string, result: PublishAttemptPrResult): Promise<void> {
  const content = result.ok
    ? JSON.stringify({ prPublished: true, prUrl: result.prUrl }, null, 2)
    : JSON.stringify({ prPublished: false, code: result.code, message: result.message }, null, 2);

  await db.insert(artifacts).values({
    id: crypto.randomUUID(),
    attemptId,
    type: "summary",
    content: `PR Publisher Result:\n${content}`,
  });
}
