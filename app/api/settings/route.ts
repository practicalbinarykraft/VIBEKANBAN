import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/settings
 * Returns current settings (keys are masked for security)
 */
export async function GET() {
  try {
    const result = await db.select().from(settings).where(eq(settings.id, "global")).get();

    if (!result) {
      return NextResponse.json({
        provider: "demo",
        anthropicApiKey: null,
        openaiApiKey: null,
        model: "claude-sonnet-4-20250514",
        hasAnthropicKey: false,
        hasOpenaiKey: false,
      });
    }

    // Return settings with masked keys (show only last 4 chars)
    return NextResponse.json({
      provider: result.provider,
      anthropicApiKey: result.anthropicApiKey ? maskKey(result.anthropicApiKey) : null,
      openaiApiKey: result.openaiApiKey ? maskKey(result.openaiApiKey) : null,
      model: result.model,
      hasAnthropicKey: !!result.anthropicApiKey,
      hasOpenaiKey: !!result.openaiApiKey,
      updatedAt: result.updatedAt,
    });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 * Update settings (provider, keys, model)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, anthropicApiKey, openaiApiKey, model } = body;

    // Build update object - only include fields that were provided
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (provider !== undefined) {
      if (!["demo", "anthropic", "openai"].includes(provider)) {
        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
      }
      updateData.provider = provider;
    }

    // Only update key if it's explicitly provided (not undefined)
    // Empty string clears the key, undefined keeps existing
    if (anthropicApiKey !== undefined) {
      updateData.anthropicApiKey = anthropicApiKey || null;
    }
    if (openaiApiKey !== undefined) {
      updateData.openaiApiKey = openaiApiKey || null;
    }
    if (model !== undefined) {
      updateData.model = model;
    }

    // Upsert settings
    const existing = await db.select().from(settings).where(eq(settings.id, "global")).get();

    if (existing) {
      await db.update(settings).set(updateData).where(eq(settings.id, "global"));
    } else {
      await db.insert(settings).values({
        id: "global",
        provider: (updateData.provider as string) || "demo",
        anthropicApiKey: updateData.anthropicApiKey as string | null,
        openaiApiKey: updateData.openaiApiKey as string | null,
        model: (updateData.model as string) || "claude-sonnet-4-20250514",
        updatedAt: new Date(),
      });
    }

    // Fetch updated settings to return
    const updated = await db.select().from(settings).where(eq(settings.id, "global")).get();

    return NextResponse.json({
      success: true,
      provider: updated?.provider,
      hasAnthropicKey: !!updated?.anthropicApiKey,
      hasOpenaiKey: !!updated?.openaiApiKey,
      model: updated?.model,
    });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Mask API key showing only last 4 characters */
function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${"*".repeat(key.length - 4)}${key.slice(-4)}`;
}
