/** POST /api/projects/[id]/factory/preflight (PR-101) - Run preflight checks */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { runPreflightChecks } from "@/server/services/factory/factory-preflight.service";
import { createPreflightDeps } from "@/server/services/factory/factory-preflight-deps";
import { FactoryErrorCode } from "@/types/factory-errors";

interface PreflightRequestBody {
  maxParallel?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  let body: PreflightRequestBody = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is OK
  }

  const maxParallel = body.maxParallel ?? 3;

  // Get project for repoPath
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    return NextResponse.json(
      { ok: false, errorCode: FactoryErrorCode.FACTORY_INVALID_CONFIG, errorMessage: "Project not found", checks: [] },
      { status: 404 }
    );
  }

  const repoPath = project.repoPath ?? process.cwd();

  const preflightDeps = createPreflightDeps();
  const result = await runPreflightChecks({ projectId, repoPath, maxParallel }, preflightDeps);

  return NextResponse.json(result);
}
