/** POST /api/projects/[id]/clone (PR-110) - Clone project with tasks */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { projects, tasks } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const newProjectId = nanoid();
  const now = new Date();

  // Create cloned project
  await db.insert(projects).values({
    id: newProjectId,
    name: `${project.name} (copy)`,
    gitUrl: project.gitUrl,
    repoPath: project.repoPath,
    defaultBranch: project.defaultBranch,
    executionStatus: "idle",
    connectionStatus: "not_checked",
    createdAt: now,
  });

  // Clone tasks (without attempts/logs/artifacts)
  const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, id));

  for (const task of projectTasks) {
    await db.insert(tasks).values({
      id: nanoid(),
      projectId: newProjectId,
      title: task.title,
      description: task.description,
      status: task.status,
      order: task.order,
      estimate: task.estimate,
      priority: task.priority,
      tags: task.tags,
      createdAt: now,
      updatedAt: now,
    });
  }

  const newProject = await db.select().from(projects).where(eq(projects.id, newProjectId)).get();

  return NextResponse.json({ project: newProject }, { status: 201 });
}
