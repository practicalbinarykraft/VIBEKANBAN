/** Attempt Execution Adapter (PR-103) - Routes execution based on agent profile */
import type { AgentProfile, AgentRunnerKind } from "@/types/agent-profile";

export interface AttemptExecutionParams {
  taskId: string;
  projectId: string;
  factoryRunId: string;
}

export interface AttemptRunnerParams {
  taskId: string;
  projectId: string;
  factoryRunId: string;
  profileId: string;
  agentLabel: string;
  env?: Record<string, string>;
}

export interface AttemptExecutionResult {
  success: boolean;
  attemptId: string | null;
  exitCode?: number;
  error?: string;
}

export interface AttemptExecutionDeps {
  runClaudeAttempt: (params: AttemptRunnerParams) => Promise<AttemptExecutionResult>;
  runLocalAttempt: (params: AttemptRunnerParams) => Promise<AttemptExecutionResult>;
  runMockAttempt: (params: AttemptRunnerParams) => Promise<AttemptExecutionResult>;
}

export interface AttemptExecutor {
  run: (params: AttemptExecutionParams) => Promise<AttemptExecutionResult>;
}

/**
 * Create an attempt executor for the given agent profile
 * Routes execution to the appropriate runner based on profile kind
 */
export function createAttemptExecutor(
  profile: AgentProfile,
  deps: AttemptExecutionDeps
): AttemptExecutor {
  const runnerFn = getRunnerForKind(profile.kind, deps);

  return {
    run: async (params: AttemptExecutionParams) => {
      const runnerParams: AttemptRunnerParams = {
        taskId: params.taskId,
        projectId: params.projectId,
        factoryRunId: params.factoryRunId,
        profileId: profile.id,
        agentLabel: profile.label,
        env: profile.env,
      };

      return runnerFn(runnerParams);
    },
  };
}

function getRunnerForKind(
  kind: AgentRunnerKind,
  deps: AttemptExecutionDeps
): (params: AttemptRunnerParams) => Promise<AttemptExecutionResult> {
  switch (kind) {
    case "claude":
      return deps.runClaudeAttempt;
    case "local":
      return deps.runLocalAttempt;
    case "mock":
      return deps.runMockAttempt;
    default:
      // Exhaustive check
      const _exhaustive: never = kind;
      throw new Error(`Unknown agent kind: ${_exhaustive}`);
  }
}
