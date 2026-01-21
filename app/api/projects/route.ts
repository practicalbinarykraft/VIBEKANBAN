import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { projects, factoryRuns } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const allProjects = await db.select().from(projects);

    // Get last factory run for each project (PR-110)
    const projectsWithRuns = await Promise.all(
      allProjects.map(async (p) => {
        const lastRun = await db.select({
          id: factoryRuns.id,
          status: factoryRuns.status,
          maxParallel: factoryRuns.maxParallel,
        })
          .from(factoryRuns)
          .where(eq(factoryRuns.projectId, p.id))
          .orderBy(desc(factoryRuns.startedAt))
          .limit(1)
          .get();
        return { ...p, lastFactoryRun: lastRun ?? null };
      })
    );

    return NextResponse.json(projectsWithRuns);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, gitUrl } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const projectId = randomUUID();
    const newProject = {
      id: projectId,
      name: name.trim(),
      gitUrl: gitUrl?.trim() || `https://github.com/example/${name.trim().toLowerCase().replace(/\s+/g, "-")}`,
      defaultBranch: "main",
    };

    await db.insert(projects).values(newProject);

    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
