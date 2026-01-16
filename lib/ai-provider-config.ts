/**
 * AI Provider Configuration
 *
 * Detects AI mode based on environment variables:
 * - DEMO: VIBE_DEMO_MODE=1 or PLAYWRIGHT=1
 * - REAL: API keys present (ANTHROPIC_API_KEY or OPENAI_API_KEY)
 * - DISABLED: No keys and not demo mode
 */

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
    process.env.VIBE_DEMO_MODE === "1" || process.env.PLAYWRIGHT === "1"
  );
}

function getAvailableProviders(): AiProvider[] {
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
  // Both providers: Anthropic is primary
  return "Anthropic (primary), OpenAI (available)";
}

export function detectAiMode(): AiProviderConfig {
  // Check for demo mode first (highest priority)
  if (isDemoMode()) {
    const reason = process.env.VIBE_DEMO_MODE === "1"
      ? "VIBE_DEMO_MODE=1"
      : "PLAYWRIGHT=1";
    return {
      mode: "demo",
      primaryProvider: null,
      availableProviders: [],
      canRunAi: true,
      bannerText: "Demo mode: responses are simulated",
      bannerVariant: "warning",
      reason,
    };
  }

  // Check for available providers
  const providers = getAvailableProviders();

  if (providers.length === 0) {
    return {
      mode: "disabled",
      primaryProvider: null,
      availableProviders: [],
      canRunAi: false,
      bannerText: "AI disabled: configure API keys",
      bannerVariant: "destructive",
      reason: "No API keys configured",
    };
  }

  // Real mode with providers
  const primaryProvider = providers.includes("anthropic")
    ? "anthropic"
    : "openai";

  return {
    mode: "real",
    primaryProvider,
    availableProviders: providers,
    canRunAi: true,
    bannerText: `Real mode: using ${formatProviderList(providers)}`,
    bannerVariant: "default",
    reason: `API keys found: ${providers.join(", ")}`,
  };
}
