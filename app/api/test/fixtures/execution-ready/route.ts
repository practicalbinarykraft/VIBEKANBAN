import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

/**
 * POST /api/test/fixtures/execution-ready
 *
 * Test fixture: Set up execution readiness for E2E tests
 * - Sets AI provider to anthropic with a test key (so aiConfigured=true)
 * - Creates fake .git directory so isRepoCloned returns true
 *
 * Body: { projectId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    // 1. Set AI settings to anthropic with test key
    const existing = await db.select().from(settings).where(eq(settings.id, "global")).get();

    if (existing) {
      await db.update(settings).set({
        provider: "anthropic",
        anthropicApiKey: "test-key-for-e2e-sk-ant-api03-xxx",
        updatedAt: new Date(),
      }).where(eq(settings.id, "global"));
    } else {
      await db.insert(settings).values({
        id: "global",
        provider: "anthropic",
        anthropicApiKey: "test-key-for-e2e-sk-ant-api03-xxx",
        openaiApiKey: null,
        model: "claude-sonnet-4-20250514",
        updatedAt: new Date(),
      });
    }

    // 2. Create fake .git directory so isRepoCloned() returns true
    const repoPath = path.join(process.cwd(), "data", "repos", projectId);
    const gitDir = path.join(repoPath, ".git");

    if (!fs.existsSync(gitDir)) {
      fs.mkdirSync(gitDir, { recursive: true });
      // Create minimal git structure
      fs.writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/heads/main\n");
      fs.mkdirSync(path.join(gitDir, "refs", "heads"), { recursive: true });
    }

    return NextResponse.json({
      success: true,
      projectId,
      aiConfigured: true,
      repoReady: true,
    });
  } catch (error: any) {
    console.error("Error setting execution ready:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
