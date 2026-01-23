/**
 * useFactoryReadiness - Hook for checking Factory readiness
 *
 * Solves UX Problems #7, #10: User doesn't know what's blocking Factory.
 * Returns checklist of requirements with pass/fail status.
 */

import { useState, useEffect, useCallback } from "react";

export interface ReadinessCheck {
  id: string;
  label: string;
  description: string;
  passed: boolean;
  fixUrl?: string;
  fixLabel?: string;
}

export interface FactoryReadinessState {
  checks: ReadinessCheck[];
  allPassed: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface AiStatus {
  realAiEligible: boolean;
  provider: string;
  reason?: string;
}

interface ProjectStatus {
  repoCloned: boolean;
  hasApiKey: boolean;
  hasTasks: boolean;
  taskCount: number;
}

export function useFactoryReadiness(projectId: string): FactoryReadinessState {
  const [checks, setChecks] = useState<ReadinessCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkReadiness = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch AI status
      const aiRes = await fetch("/api/ai/status");
      const aiStatus: AiStatus = aiRes.ok
        ? await aiRes.json()
        : { realAiEligible: false, provider: "unknown", reason: "FETCH_ERROR" };

      // Fetch project info (tasks count)
      const projectRes = await fetch(`/api/projects/${projectId}`);
      const project = projectRes.ok ? await projectRes.json() : null;

      // Fetch tasks
      const tasksRes = await fetch(`/api/projects/${projectId}/tasks`);
      const tasks = tasksRes.ok ? await tasksRes.json() : [];
      const todoTasks = tasks.filter((t: any) => t.status === "todo" || t.status === "in_progress");

      const newChecks: ReadinessCheck[] = [
        {
          id: "ai-enabled",
          label: "AI Execution Enabled",
          description: aiStatus.realAiEligible
            ? `Using ${aiStatus.provider}`
            : `Blocked: ${aiStatus.reason || "Unknown reason"}`,
          passed: aiStatus.realAiEligible,
          fixUrl: "/settings?context=factory-blocked&reason=ai-disabled",
          fixLabel: "Configure AI",
        },
        {
          id: "has-tasks",
          label: "Tasks Available",
          description: todoTasks.length > 0
            ? `${todoTasks.length} tasks ready to execute`
            : "No tasks in To Do or In Progress",
          passed: todoTasks.length > 0,
          fixUrl: `/projects/${projectId}?tab=planning`,
          fixLabel: "Create Tasks",
        },
        {
          id: "repo-configured",
          label: "Repository Configured",
          description: project?.repoPath
            ? `Using: ${project.repoPath}`
            : "Repository path not set",
          passed: !!project?.repoPath,
          fixUrl: `/projects/${projectId}/settings`,
          fixLabel: "Configure Repository",
        },
      ];

      setChecks(newChecks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check readiness");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    checkReadiness();
  }, [checkReadiness]);

  const allPassed = checks.length > 0 && checks.every((c) => c.passed);

  return {
    checks,
    allPassed,
    loading,
    error,
    refresh: checkReadiness,
  };
}
