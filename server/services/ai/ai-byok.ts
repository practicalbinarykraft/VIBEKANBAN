/**
 * BYOK (Bring Your Own Key) Service (PR-122)
 *
 * Handles reading API keys from database settings table.
 * Priority: DB (BYOK) > env vars (fallback for dev/CI)
 */

import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/** BYOK settings from database */
export interface ByokSettings {
  provider: string;
  anthropicApiKey: string | null;
  openaiApiKey: string | null;
  model: string | null;
}

/**
 * Get BYOK settings from database
 * Returns null if no settings exist
 */
export async function getByokSettings(): Promise<ByokSettings | null> {
  try {
    const result = await db.select().from(settings).where(eq(settings.id, "global")).get();
    if (!result) return null;
    return {
      provider: result.provider,
      anthropicApiKey: result.anthropicApiKey,
      openaiApiKey: result.openaiApiKey,
      model: result.model,
    };
  } catch {
    // DB not available (e.g., in some test scenarios)
    return null;
  }
}

/**
 * Get API key for a provider from BYOK (DB) or env fallback
 * Priority: DB > env
 */
export function getApiKey(
  provider: "anthropic" | "openai",
  byokSettings: ByokSettings | null
): string | null {
  // BYOK takes priority
  if (byokSettings) {
    if (provider === "anthropic" && byokSettings.anthropicApiKey) {
      return byokSettings.anthropicApiKey;
    }
    if (provider === "openai" && byokSettings.openaiApiKey) {
      return byokSettings.openaiApiKey;
    }
  }
  // Fallback to env vars
  if (provider === "anthropic") {
    return process.env.ANTHROPIC_API_KEY || null;
  }
  if (provider === "openai") {
    return process.env.OPENAI_API_KEY || null;
  }
  return null;
}

/**
 * Check if provider has a key configured (BYOK or env)
 */
export function hasProviderKey(
  provider: "anthropic" | "openai",
  byokSettings: ByokSettings | null
): boolean {
  return !!getApiKey(provider, byokSettings);
}
