/**
 * Project Repository API
 *
 * GET: Returns repo status (path, cloned status)
 * POST: Ensures repo is cloned/synced and returns updated status
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  ensureRepoCloned,
  isRepoCloned,
  getRepoPath,
} from "@/server/services/git/clone-repo";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface RepoStatus {
  repoPath: string | null;
  isCloned: boolean;
  gitUrl: string;
  defaultBranch: string;
}

interface RepoEnsureResult extends RepoStatus {
  alreadyExists: boolean;
  error?: string;
}

/**
 * GET /api/projects/[id]/repo
 * Returns current repo status without any operations
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<RepoStatus | { error: string }>> {
  const { id } = await context.params;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .get();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const cloned = isRepoCloned(id);
  const repoPath = cloned ? getRepoPath(id) : project.repoPath;

  return NextResponse.json({
    repoPath: repoPath || null,
    isCloned: cloned,
    gitUrl: project.gitUrl,
    defaultBranch: project.defaultBranch,
  });
}

/**
 * POST /api/projects/[id]/repo
 * Ensures repo is cloned/synced and updates project.repoPath
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<RepoEnsureResult | { error: string }>> {
  const { id } = await context.params;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .get();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check connection status first
  if (project.connectionStatus !== "connected") {
    return NextResponse.json(
      {
        error: "Repository connection not verified. Verify connection first.",
      },
      { status: 400 }
    );
  }

  // Clone/sync the repo
  const result = await ensureRepoCloned({
    projectId: id,
    gitUrl: project.gitUrl,
    defaultBranch: project.defaultBranch,
  });

  if (result.error) {
    return NextResponse.json(
      {
        repoPath: result.repoPath,
        isCloned: false,
        alreadyExists: result.alreadyExists,
        gitUrl: project.gitUrl,
        defaultBranch: project.defaultBranch,
        error: result.error,
      },
      { status: 500 }
    );
  }

  // Update project with repoPath
  await db
    .update(projects)
    .set({ repoPath: result.repoPath })
    .where(eq(projects.id, id));

  return NextResponse.json({
    repoPath: result.repoPath,
    isCloned: true,
    alreadyExists: result.alreadyExists,
    gitUrl: project.gitUrl,
    defaultBranch: project.defaultBranch,
  });
}
