import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { tasks } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * GET /api/projects/[id]/tasks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, id)).all();
    return NextResponse.json(projectTasks);
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/tasks
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, status = 'todo' } = body;
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
    const taskId = randomUUID();
    await db.insert(tasks).values({
      id: taskId,
      projectId: id,
      title,
      description: description || '',
      status,
      order: 0,
    });
    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
