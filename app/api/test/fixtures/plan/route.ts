import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { councilThreads, planArtifacts, projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * POST /api/test/fixtures/plan
 *
 * Create a test plan artifact for E2E testing.
 * Only available in test/dev mode.
 */
export async function POST(request: NextRequest) {
  // Only allow in test mode
  if (process.env.NODE_ENV === "production" && process.env.PLAYWRIGHT !== "1") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      projectId,
      status = "approved",
      tasks = [
        { title: "Task 1", description: "Do thing 1", type: "backend", estimate: "S" },
        { title: "Task 2", description: "Do thing 2", type: "frontend", estimate: "M" },
      ],
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // Ensure project exists (create if not)
    const existingProject = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!existingProject) {
      await db.insert(projects).values({
        id: projectId,
        name: `Test Project ${projectId}`,
        gitUrl: "https://github.com/test/test",
        defaultBranch: "main",
      });
    }

    // Create council thread
    const threadId = randomUUID();
    await db.insert(councilThreads).values({
      id: threadId,
      projectId,
      iterationNumber: 1,
      status: "approved",
      ideaText: "Test idea for E2E",
      language: "en",
      currentTurn: 0,
    });

    // Create plan artifact
    const planId = randomUUID();
    await db.insert(planArtifacts).values({
      id: planId,
      threadId,
      version: 1,
      status,
      summary: "Test plan for E2E",
      scope: "E2E testing scope",
      tasks: JSON.stringify(tasks),
      taskCount: tasks.length,
      estimate: "M",
    });

    return NextResponse.json({
      planId,
      threadId,
      status,
      taskCount: tasks.length,
    });
  } catch (error: any) {
    console.error("Error creating test plan:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
