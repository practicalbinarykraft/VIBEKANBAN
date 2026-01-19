"use client";

import { AppShell } from "@/components/app-shell";
import { AiModeSection } from "@/components/settings/ai-mode-section";
import { RealAiStatusCard } from "@/components/settings/real-ai-status-card";
import { AiUsageCard } from "@/components/settings/ai-usage-card";
import { AIProvidersCard } from "@/components/settings/ai-providers-card";
import { AiUsageHistoryCard } from "@/components/settings/ai-usage-history-card";
import { AIUsageAlertsCard } from "@/components/settings/ai-usage-alerts-card";
import { Settings } from "lucide-react";

const isDemoMode =
  process.env.NEXT_PUBLIC_VIBE_DEMO_MODE === "1" ||
  process.env.NEXT_PUBLIC_PLAYWRIGHT === "1";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="min-h-[calc(100vh-3rem)] bg-muted/20">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure your Vibe Kanban workspace
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <RealAiStatusCard />
            <AIUsageAlertsCard />
            <AiUsageCard />
            <AIProvidersCard />
            <AiUsageHistoryCard />
            <section data-testid="ai-mode-section">
              {isDemoMode && <span className="text-xs text-muted-foreground">Demo</span>}
              <AiModeSection />
            </section>

            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-2 font-semibold">Coming Soon</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Git configuration and SSH key management</li>
                <li>• Docker runner resource limits</li>
                <li>• Notification preferences</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
