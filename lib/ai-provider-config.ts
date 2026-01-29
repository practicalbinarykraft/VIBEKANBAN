/**
 * AI Provider Configuration
 *
 * Detects AI mode based on:
 * 1. BYOK settings from database (highest priority for real mode)
 * 2. Environment variables (fallback)
 * 3. Demo mode flags
 */

import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { isMockModeEnabled, getMockModeReason } from "./mock-mode";

export type AiMode = "demo" | "real" | "disabled";
export type AiProvider = "anthropic" | "openai";
export type BannerVariant = "default" | "warning" | "destructive";

export interface AiProviderConfig {
  mode: AiMode;
  primaryProvider: AiProvider | null;
  availableProviders: AiProvider[];
  canRunAi: boolean;
  bannerText: string;
  bannerVariant: BannerVariant;
  reason: string;
}

function isDemoMode(): boolean {
  return (
    process.env.VIBE_DEMO_MODE === "1" || isMockModeEnabled()
  );
}

function getEnvProviders(): AiProvider[] {
  const providers: AiProvider[] = [];
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push("anthropic");
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push("openai");
  }
  return providers;
}

function formatProviderList(providers: AiProvider[]): string {
  if (providers.length === 0) return "";
  if (providers.length === 1) {
    return providers[0] === "anthropic" ? "Anthropic" : "OpenAI";
  }
  return "Anthropic (primary), OpenAI (available)";
}

/**
 * Synchronous version - uses only env vars (legacy, for backwards compat)
 */
export function detectAiMode(): AiProviderConfig {
  if (isDemoMode()) {
    const reason = process.env.VIBE_DEMO_MODE === "1"
      ? "VIBE_DEMO_MODE=1"
      : getMockModeReason() || "Mock mode";
    return {
      mode: "demo",
      primaryProvider: null,
      availableProviders: [],
      canRunAi: true,
      bannerText: `Mock mode: ${reason}`,
      bannerVariant: "warning",
      reason,
    };
  }

  const providers = getEnvProviders();
  if (providers.length === 0) {
    return {
      mode: "disabled",
      primaryProvider: null,
      availableProviders: [],
      canRunAi: false,
      bannerText: "AI disabled: configure API keys in Settings",
      bannerVariant: "destructive",
      reason: "No API keys configured",
    };
  }

  const primaryProvider = providers.includes("anthropic") ? "anthropic" : "openai";
  return {
    mode: "real",
    primaryProvider,
    availableProviders: providers,
    canRunAi: true,
    bannerText: `Real AI: ${formatProviderList(providers)}`,
    bannerVariant: "default",
    reason: `API keys found: ${providers.join(", ")}`,
  };
}

/**
 * Async version - checks BYOK settings from DB first, then env vars
 * This should be used in API routes
 */
export async function detectAiModeAsync(): Promise<AiProviderConfig> {
  // Check for demo mode first
  if (isDemoMode()) {
    const reason = process.env.VIBE_DEMO_MODE === "1"
      ? "VIBE_DEMO_MODE=1"
      : getMockModeReason() || "Mock mode";
    return {
      mode: "demo",
      primaryProvider: null,
      availableProviders: [],
      canRunAi: true,
      bannerText: `Mock mode: ${reason}`,
      bannerVariant: "warning",
      reason,
    };
  }

  // Check BYOK settings from database
  try {
    const result = await db.select().from(settings).where(eq(settings.id, "global")).get();

    if (result) {
      const providers: AiProvider[] = [];
      if (result.anthropicApiKey) providers.push("anthropic");
      if (result.openaiApiKey) providers.push("openai");

      if (providers.length > 0) {
        // Use provider from settings, or default to first available
        const selectedProvider = result.provider as AiProvider | "demo";
        const primaryProvider =
          selectedProvider !== "demo" && providers.includes(selectedProvider)
            ? selectedProvider
            : providers[0];

        return {
          mode: "real",
          primaryProvider,
          availableProviders: providers,
          canRunAi: true,
          bannerText: `Real AI: ${formatProviderList([primaryProvider])} (BYOK)`,
          bannerVariant: "default",
          reason: "BYOK keys configured in Settings",
        };
      }
    }
  } catch (error) {
    console.error("[AI Config] DB check failed:", error);
  }

  // Fallback to env vars
  const envProviders = getEnvProviders();
  if (envProviders.length > 0) {
    const primaryProvider = envProviders.includes("anthropic") ? "anthropic" : "openai";
    return {
      mode: "real",
      primaryProvider,
      availableProviders: envProviders,
      canRunAi: true,
      bannerText: `Real AI: ${formatProviderList(envProviders)}`,
      bannerVariant: "default",
      reason: `Env keys: ${envProviders.join(", ")}`,
    };
  }

  return {
    mode: "disabled",
    primaryProvider: null,
    availableProviders: [],
    canRunAi: false,
    bannerText: "AI disabled: configure API keys in Settings",
    bannerVariant: "destructive",
    reason: "No API keys configured",
  };
}
