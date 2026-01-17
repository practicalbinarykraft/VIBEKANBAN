"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Bot, Sparkles } from "lucide-react";

type BannerVariant = "default" | "warning" | "destructive";

interface AiModeConfig {
  mode: string;
  bannerText: string;
  bannerVariant: BannerVariant;
  canRunAi: boolean;
}

const VARIANT_STYLES: Record<BannerVariant, string> = {
  default: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200",
  destructive: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200",
};

const VARIANT_ICONS: Record<BannerVariant, typeof Bot> = {
  default: Sparkles,
  warning: Bot,
  destructive: AlertCircle,
};

export function AiModeBanner() {
  const [config, setConfig] = useState<AiModeConfig | null>(null);

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
      }
    };
    fetchConfig();
  }, []);

  if (!config) {
    return null;
  }

  const Icon = VARIANT_ICONS[config.bannerVariant];
  const styles = VARIANT_STYLES[config.bannerVariant];

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-md ${styles}`}
      data-testid="ai-mode-banner"
      data-mode={config.mode}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{config.bannerText}</span>
      {config.mode === "disabled" && (
        <a
          href="/settings"
          className="ml-auto text-xs opacity-75 underline hover:opacity-100"
        >
          Configure in Settings →
        </a>
      )}
    </div>
  );
}
