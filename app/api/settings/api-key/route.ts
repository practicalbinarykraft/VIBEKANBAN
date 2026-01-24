/**
 * API Key Management Endpoint (PR-123)
 *
 * DELETE: Remove a specific provider's API key from BYOK settings
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const VALID_PROVIDERS = ["anthropic", "openai"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

/**
 * DELETE /api/settings/api-key?provider=anthropic|openai
 * Removes the specified provider's API key
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    // Validate provider parameter
    if (!provider) {
      return NextResponse.json({ error: "Provider parameter required" }, { status: 400 });
    }

    if (!VALID_PROVIDERS.includes(provider as Provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}` },
        { status: 400 }
      );
    }

    // Get existing settings
    const existing = await db.select().from(settings).where(eq(settings.id, "global")).get();

    if (!existing) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    }

    // Determine which key field to clear
    const keyField = provider === "anthropic" ? "anthropicApiKey" : "openaiApiKey";

    // Clear the key
    await db
      .update(settings)
      .set({
        [keyField]: null,
        updatedAt: new Date(),
      })
      .where(eq(settings.id, "global"));

    return NextResponse.json({ success: true, provider });
  } catch (error: unknown) {
    console.error("Error removing API key:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
