"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Bot, AlertTriangle, Settings } from "lucide-react";

interface SettingsData {
  provider: "demo" | "anthropic" | "openai";
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
}

type AiMode = "demo" | "real" | "disabled";

interface AiModeBannerProps {
  className?: string;
}

/**
 * Check if demo mode is forced via environment variable
 * NEXT_PUBLIC_ prefix required for client-side access
 */
function isDemoModeEnv(): boolean {
  return process.env.NEXT_PUBLIC_VIBE_DEMO_MODE === "1";
}

export function AiModeBanner({ className = "" }: AiModeBannerProps) {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return null;
  }

  const getAiMode = (): AiMode => {
    // Demo mode env var overrides everything
    if (isDemoModeEnv()) return "demo";

    if (!settings) return "demo";
    if (settings.provider === "demo") return "demo";
    if (settings.provider === "anthropic" && !settings.hasAnthropicKey) return "disabled";
    if (settings.provider === "openai" && !settings.hasOpenaiKey) return "disabled";
    return "real";
  };

  const mode = getAiMode();

  if (mode === "real") {
    // Don't show banner when real AI is working correctly
    return null;
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-2 ${
        mode === "demo"
          ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
          : "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950"
      } ${className}`}
      data-testid="ai-mode-banner"
    >
      <div className="flex items-center gap-2">
        {mode === "demo" ? (
          <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        )}
        <span className="text-sm">
          {mode === "demo" ? (
            <>
              <span className="font-medium">Demo Mode</span>
              <span className="text-muted-foreground"> - AI responses are mocked</span>
            </>
          ) : (
            <>
              <span className="font-medium">AI Disabled</span>
              <span className="text-muted-foreground"> - API key not configured</span>
            </>
          )}
        </span>
        <Badge
          variant={mode === "demo" ? "secondary" : "outline"}
          className={`ml-2 text-[10px] ${
            mode === "disabled" ? "border-yellow-500/30 text-yellow-700 dark:text-yellow-400" : ""
          }`}
        >
          {mode === "demo" ? "Mock" : "Disabled"}
        </Badge>
      </div>
      <Link
        href="/settings"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Settings className="h-3.5 w-3.5" />
        <span>Settings</span>
      </Link>
    </div>
  );
}
