/**
 * Project Connection Status API
 *
 * GET: Returns current connection status (computed, no verification)
 * POST: Triggers verification and returns updated status
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  computeConnectionStatus,
  ConnectionStatusResult,
} from "@/lib/repo-connection-status";
import {
  getGithubToken,
  verifyRepoAccess,
} from "@/server/services/github/repo-verify";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ConnectionStatusResult | { error: string }>> {
  const { id } = await context.params;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .get();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const githubToken = getGithubToken();
  const status = computeConnectionStatus({
    gitUrl: project.gitUrl,
    githubToken,
    verified: false,
  });

  return NextResponse.json(status);
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ConnectionStatusResult | { error: string }>> {
  const { id } = await context.params;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .get();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const githubToken = getGithubToken();

  // If no token, can't verify
  if (!githubToken) {
    const status = computeConnectionStatus({
      gitUrl: project.gitUrl,
      githubToken: undefined,
      verified: false,
    });
    return NextResponse.json(status);
  }

  // Verify repo access
  const verificationResult = await verifyRepoAccess({
    gitUrl: project.gitUrl,
    githubToken,
  });

  const status = computeConnectionStatus({
    gitUrl: project.gitUrl,
    githubToken,
    verified: true,
    verificationResult,
  });

  return NextResponse.json(status);
}
