/** POST /api/projects/[id]/factory/start (PR-82, PR-86, PR-101, PR-103) - Start factory worker */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { createRun } from "@/server/services/autopilot/autopilot-runs.service";
import { FactoryWorkerService } from "@/server/services/factory/factory-worker.service";
import { createWorkerDeps } from "@/server/services/factory/factory-deps";
import { runPreflightChecks } from "@/server/services/factory/factory-preflight.service";
import { createPreflightDeps } from "@/server/services/factory/factory-preflight-deps";
import { FactoryErrorCode, FACTORY_ERROR_MESSAGES } from "@/types/factory-errors";
import { getAgentProfileById, getDefaultAgentProfile } from "@/server/services/agents/agent-profiles.registry";

interface StartRequestBody {
  maxParallel?: number;
  skipPreflight?: boolean;
  agentProfileId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  // Parse body
  let body: StartRequestBody = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is OK, use defaults
  }

  const maxParallel = body.maxParallel ?? 3;

  // PR-103: Validate agent profile
  const agentProfile = body.agentProfileId
    ? getAgentProfileById(body.agentProfileId)
    : getDefaultAgentProfile();

  if (!agentProfile) {
    return NextResponse.json(
      { error: `Unknown agent profile: ${body.agentProfileId}`, code: FactoryErrorCode.FACTORY_INVALID_CONFIG },
      { status: 400 }
    );
  }

  // Get project for repoPath
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    return NextResponse.json(
      { error: "Project not found", code: FactoryErrorCode.FACTORY_INVALID_CONFIG },
      { status: 404 }
    );
  }

  const repoPath = project.repoPath ?? process.cwd();

  // PR-101: Run preflight checks (atomic operation)
  if (!body.skipPreflight) {
    const preflightDeps = createPreflightDeps();
    const preflightResult = await runPreflightChecks(
      { projectId, repoPath, maxParallel },
      preflightDeps
    );

    if (!preflightResult.ok) {
      const code = preflightResult.errorCode ?? FactoryErrorCode.FACTORY_PREFLIGHT_FAILED;
      return NextResponse.json(
        {
          error: preflightResult.errorMessage ?? FACTORY_ERROR_MESSAGES[code],
          code,
          checks: preflightResult.checks,
        },
        { status: 409 }
      );
    }
  }

  // Create autopilot run
  const runResult = await createRun(projectId);
  if (!runResult.ok) {
    return NextResponse.json(
      { error: "Failed to create run", code: FactoryErrorCode.FACTORY_PREFLIGHT_FAILED },
      { status: 500 }
    );
  }

  const { runId: autopilotRunId } = runResult;

  // Start worker in background (PR-86, PR-103)
  const workerDeps = createWorkerDeps();
  const worker = new FactoryWorkerService(workerDeps);
  const { started } = await worker.startOrAttach({
    projectId,
    runId: autopilotRunId,
    maxParallel,
    agentProfileId: agentProfile.id,
  });

  return NextResponse.json({ autopilotRunId, started, agentProfileId: agentProfile.id });
}
