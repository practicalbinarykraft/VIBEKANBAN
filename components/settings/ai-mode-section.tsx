"use client";

import { useState, useEffect } from "react";
import { Bot, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AiConfig {
  mode: "demo" | "real" | "disabled";
  primaryProvider: string | null;
  availableProviders: string[];
  canRunAi: boolean;
  bannerText: string;
}

const MODE_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  demo: { label: "Demo", variant: "secondary" },
  real: { label: "Real", variant: "default" },
  disabled: { label: "Disabled", variant: "destructive" },
};

const ENV_VARS = [
  { name: "ANTHROPIC_API_KEY", provider: "Anthropic Claude" },
  { name: "OPENAI_API_KEY", provider: "OpenAI GPT" },
  { name: "VIBE_DEMO_MODE", provider: "Demo mode (set to 1)" },
];

export function AiModeSection() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/settings/ai-provider");
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      } catch (error) {
        console.error("Failed to fetch AI config:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  const modeBadge = MODE_BADGES[config.mode];

  return (
    <div className="rounded-lg border bg-card p-6" data-testid="ai-mode-section">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Bot className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-semibold">AI Provider</h2>
          <p className="text-sm text-muted-foreground">Current mode and configuration</p>
        </div>
        <Badge variant={modeBadge.variant} className="ml-auto">
          {modeBadge.label}
        </Badge>
      </div>

      <div className="mb-4 rounded-md bg-muted/50 p-3">
        <p className="text-sm">{config.bannerText}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Environment Variables</h3>
        <div className="space-y-2">
          {ENV_VARS.map(({ name, provider }) => {
            const isSet = name === "VIBE_DEMO_MODE"
              ? config.mode === "demo"
              : config.availableProviders.includes(name.includes("ANTHROPIC") ? "anthropic" : "openai");

            return (
              <div
                key={name}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <code className="text-xs font-mono">{name}</code>
                  <p className="text-xs text-muted-foreground">{provider}</p>
                </div>
                {isSet ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {config.mode === "disabled" && (
        <div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            To enable AI features, set one of the API keys in your <code>.env</code> file.
          </p>
        </div>
      )}
    </div>
  );
}
