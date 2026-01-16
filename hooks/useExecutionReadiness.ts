/**
 * useExecutionReadiness - Check if execution is allowed
 *
 * Returns execution readiness state based on:
 * - AI configured (API key present)
 * - Git repo ready (repoPath set and valid)
 */

"use client";

import { useState, useEffect } from "react";

export interface ExecutionReadiness {
  isReady: boolean;
  isLoading: boolean;
  aiConfigured: boolean;
  repoReady: boolean;
  reason?: string;
}

export function useExecutionReadiness(projectId: string | null): ExecutionReadiness {
  const [state, setState] = useState<ExecutionReadiness>({
    isReady: false,
    isLoading: true,
    aiConfigured: false,
    repoReady: false,
  });

  useEffect(() => {
    if (!projectId) {
      setState({
        isReady: false,
        isLoading: false,
        aiConfigured: false,
        repoReady: false,
        reason: "No project selected",
      });
      return;
    }

    async function checkReadiness() {
      try {
        // Check AI settings
        const settingsRes = await fetch("/api/settings");
        const settings = settingsRes.ok ? await settingsRes.json() : null;
        const aiConfigured =
          settings?.provider !== "demo" &&
          ((settings?.provider === "anthropic" && settings?.hasAnthropicKey) ||
            (settings?.provider === "openai" && settings?.hasOpenaiKey));

        // Check repo status
        const repoRes = await fetch(`/api/projects/${projectId}/repo`);
        const repo = repoRes.ok ? await repoRes.json() : null;
        const repoReady = repo?.isCloned === true;

        const isReady = aiConfigured && repoReady;
        let reason: string | undefined;

        if (!aiConfigured && !repoReady) {
          reason = "Configure AI and clone repository to execute tasks";
        } else if (!aiConfigured) {
          reason = "Configure AI provider to execute tasks";
        } else if (!repoReady) {
          reason = "Clone repository to execute tasks";
        }

        setState({
          isReady,
          isLoading: false,
          aiConfigured,
          repoReady,
          reason,
        });
      } catch (error) {
        setState({
          isReady: false,
          isLoading: false,
          aiConfigured: false,
          repoReady: false,
          reason: "Could not check execution readiness",
        });
      }
    }

    checkReadiness();
  }, [projectId]);

  return state;
}
