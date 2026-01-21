"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AiModeSection } from "@/components/settings/ai-mode-section";
import { RealAiStatusCard } from "@/components/settings/real-ai-status-card";
import { AiStatusUnified } from "@/components/settings/ai-status-unified";
import { AiUsageCard } from "@/components/settings/ai-usage-card";
import { AIProvidersCard } from "@/components/settings/ai-providers-card";
import { AiUsageHistoryCard } from "@/components/settings/ai-usage-history-card";
import { AIUsageAlertsCard } from "@/components/settings/ai-usage-alerts-card";
import { Settings, AlertTriangle } from "lucide-react";

/**
 * Context-aware Settings page (PR-115)
 *
 * Supports query parameters:
 * - ?context=factory-blocked - User was sent here because Factory couldn't start
 * - ?context=planning-blocked - User was sent here because Planning couldn't start
 * - ?reason=missing-api-key - Specific reason for the block
 */

function SettingsContent() {
  const searchParams = useSearchParams();
  const context = searchParams.get("context");
  const reason = searchParams.get("reason");

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

          {/* Context banner - shown when user was redirected here (PR-115) */}
          {context && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-200">
                    {context === "factory-blocked" && "Factory cannot start"}
                    {context === "planning-blocked" && "Planning cannot start"}
                    {context === "execution-blocked" && "Task execution blocked"}
                    {!["factory-blocked", "planning-blocked", "execution-blocked"].includes(context) && "Action blocked"}
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {reason === "missing-api-key" && "You need to configure an API key to use AI features."}
                    {reason === "budget-exceeded" && "Your monthly budget limit has been reached."}
                    {reason === "ai-disabled" && "Real AI execution is disabled."}
                    {!reason && "Check the AI status below to see what needs to be configured."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Unified AI Status - single source of truth (PR-114) */}
            <AiStatusUnified context={context || undefined} />

            {/* Legacy status card - kept for reference */}
            <RealAiStatusCard />
            <AIUsageAlertsCard />
            <AiUsageCard />
            <AIProvidersCard />
            <AiUsageHistoryCard />
            <div data-testid="ai-mode-section" className="text-xs text-muted-foreground mb-1">Demo</div>
            <AiModeSection />

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

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="min-h-[calc(100vh-3rem)] bg-muted/20 flex items-center justify-center">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      </AppShell>
    }>
      <SettingsContent />
    </Suspense>
  );
}
