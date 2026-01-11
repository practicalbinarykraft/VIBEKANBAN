import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts, logs, artifacts } from "@/server/db/schema";
import { randomUUID } from "crypto";

/**
 * Test fixture endpoint - creates mock attempt with logs and artifacts
 * ONLY works in test/dev environments for E2E testing
 *
 * Security: Blocked in production unless PLAYWRIGHT=1 is set
 */

// Security gate: only allow in test environments
function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.PLAYWRIGHT === "1"
  );
}

interface FixtureRequestBody {
  taskId: string;
  status?: "completed" | "failed";
  withArtifacts?: boolean;
  withLogs?: boolean;
  withApplyError?: boolean;
  applyErrorMessage?: string;
  noDiff?: boolean;
  withPR?: boolean;
  prStatus?: 'open' | 'merged' | 'closed';
  withConflict?: boolean;
  conflictFiles?: string[];
  forceStatus?: 'running' | 'queued' | 'stopped';
}

export async function POST(request: NextRequest) {
  // Security gate: return 404 in non-test environments
  if (!isTestEnvironment()) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  try {
    const body: FixtureRequestBody = await request.json();
    const {
      taskId,
      status = "completed",
      withArtifacts = true,
      withLogs = true,
      withApplyError = false,
      applyErrorMessage,
      noDiff = false,
      withPR = false,
      prStatus = 'open',
      withConflict = false,
      conflictFiles = [],
      forceStatus,
    } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    const attemptId = randomUUID();
    const now = new Date();
    const finalStatus = forceStatus || status;
    const isQueued = forceStatus === 'queued';
    const isRunningOrQueued = forceStatus === 'running' || isQueued;
    const finalStartedAt = isQueued ? now : new Date(now.getTime() - 60000);
    const finalFinishedAt = isRunningOrQueued ? null : new Date(now.getTime() - 10000);
    const queuedAt = isQueued ? new Date(now.getTime() - 30000) : null;
    const defaultConflictFiles = ['src/components/task-actions.tsx', 'server/api/apply.ts'];
    const conflictFilesData = withConflict
      ? (conflictFiles.length > 0 ? conflictFiles : defaultConflictFiles)
      : null;

    await db.insert(attempts).values({
      id: attemptId,
      taskId,
      queuedAt,
      startedAt: finalStartedAt,
      finishedAt: finalFinishedAt,
      status: finalStatus,
      agent: "Claude Sonnet 4.5",
      baseBranch: "main",
      branchName: `attempt/${attemptId.slice(0, 8)}`,
      baseCommit: "abc123def456",
      headCommit: finalStatus === "completed" ? "def456abc123" : null,
      worktreePath: `/tmp/worktree-${attemptId}`,
      mergeStatus: withConflict ? "conflict" : "not_merged",
      exitCode: finalStatus === "completed" ? 0 : 1,
      applyError: withApplyError ? (applyErrorMessage || "Merge conflict: src/example.ts") : null,
      prNumber: withPR ? 42 : null,
      prUrl: withPR ? "https://github.com/test-org/test-repo/pull/42" : null,
      prStatus: withPR ? prStatus : null,
      conflictFiles: conflictFilesData ? JSON.stringify(conflictFilesData) : null,
    });
    // Create logs if requested
    if (withLogs) {
      const sampleLogs = [
        { level: "info", message: "🚀 Starting task execution..." },
        { level: "info", message: "📦 Setting up environment..." },
        { level: "info", message: "✓ Environment ready" },
        { level: "info", message: "🔨 Running analysis..." },
        { level: "info", message: "✓ Analysis complete" },
        status === "completed"
          ? { level: "info", message: "✅ Task completed successfully" }
          : { level: "error", message: "❌ Task failed with errors" },
      ];
      for (let i = 0; i < sampleLogs.length; i++) {
        const log = sampleLogs[i];
        await db.insert(logs).values({
          id: randomUUID(),
          attemptId,
          timestamp: new Date(finalStartedAt.getTime() + i * 10000),
          level: log.level,
          message: log.message,
        });
      }
    }
    // Create artifacts if requested (unless noDiff is true)
    if (withArtifacts && !noDiff) {
      // Create diff artifact (unified diff format)
      const diffContent = `diff --git a/src/example.ts b/src/example.ts
index 1234567..abcdefg 100644
--- a/src/example.ts
+++ b/src/example.ts
@@ -1,5 +1,8 @@
 export function hello(name: string) {
-  return \`Hello, \${name}!\`;
+  return \`Hello, \${name}! Welcome to Vibe Kanban.\`;
 }

+export function goodbye(name: string) {
+  return \`Goodbye, \${name}! See you soon.\`;
+}

diff --git a/src/types.ts b/src/types.ts
index abc1234..def5678 100644
--- a/src/types.ts
+++ b/src/types.ts
@@ -1,3 +1,6 @@
 export interface User {
   name: string;
+  email: string;
+  role: 'admin' | 'user';
 }`;

      await db.insert(artifacts).values({
        id: randomUUID(),
        attemptId,
        type: "diff",
        content: diffContent,
      });
      // Create summary artifact
      const summaryContent = `# Task Execution Summary

## Changes Made
- Updated \`hello\` function to include welcome message
- Added new \`goodbye\` function
- Enhanced User interface with email and role fields

## Files Modified
- \`src/example.ts\` (+3 lines)
- \`src/types.ts\` (+3 lines)

## Test Results
- All tests passed ✅
- Code coverage: 95%

## Next Steps
- Review changes and merge to main
- Update documentation`;

      await db.insert(artifacts).values({
        id: randomUUID(),
        attemptId,
        type: "summary",
        content: summaryContent,
      });
    }

    return NextResponse.json({
      attemptId,
      status: "success",
      message: "Fixture attempt created successfully",
    });
  } catch (error: any) {
    console.error("Error creating fixture attempt:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
