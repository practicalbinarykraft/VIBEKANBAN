import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";

export async function GET() {
  try {
    const allProjects = await db.select().from(projects);
    return NextResponse.json(allProjects);
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
