/** Attempt Execution Adapter Tests (PR-103) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAttemptExecutor,
  type AttemptExecutionDeps,
  type AttemptExecutionParams,
} from "../attempt-execution-adapter";
import type { AgentProfile } from "@/types/agent-profile";

const mockProfile: AgentProfile = {
  id: "claude-default",
  label: "Claude (Default)",
  kind: "claude",
  env: { FEATURE_REAL_AI: "true" },
};

const mockLocalProfile: AgentProfile = {
  id: "local-default",
  label: "Local Agent",
  kind: "local",
};

const mockMockProfile: AgentProfile = {
  id: "mock",
  label: "Mock (Testing)",
  kind: "mock",
};

function createMockDeps(overrides: Partial<AttemptExecutionDeps> = {}): AttemptExecutionDeps {
  return {
    runClaudeAttempt: vi.fn().mockResolvedValue({ success: true, attemptId: "attempt-1" }),
    runLocalAttempt: vi.fn().mockResolvedValue({ success: true, attemptId: "attempt-2" }),
    runMockAttempt: vi.fn().mockResolvedValue({ success: true, attemptId: "attempt-3" }),
    ...overrides,
  };
}

describe("attempt-execution-adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createAttemptExecutor", () => {
    it("routes claude profile to runClaudeAttempt", async () => {
      const deps = createMockDeps();
      const executor = createAttemptExecutor(mockProfile, deps);

      const params: AttemptExecutionParams = {
        taskId: "task-1",
        projectId: "proj-1",
        factoryRunId: "run-1",
      };

      await executor.run(params);

      expect(deps.runClaudeAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: "task-1",
          agentLabel: "Claude (Default)",
        })
      );
      expect(deps.runLocalAttempt).not.toHaveBeenCalled();
      expect(deps.runMockAttempt).not.toHaveBeenCalled();
    });

    it("routes local profile to runLocalAttempt", async () => {
      const deps = createMockDeps();
      const executor = createAttemptExecutor(mockLocalProfile, deps);

      const params: AttemptExecutionParams = {
        taskId: "task-1",
        projectId: "proj-1",
        factoryRunId: "run-1",
      };

      await executor.run(params);

      expect(deps.runLocalAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: "task-1",
          agentLabel: "Local Agent",
        })
      );
      expect(deps.runClaudeAttempt).not.toHaveBeenCalled();
    });

    it("routes mock profile to runMockAttempt", async () => {
      const deps = createMockDeps();
      const executor = createAttemptExecutor(mockMockProfile, deps);

      const params: AttemptExecutionParams = {
        taskId: "task-1",
        projectId: "proj-1",
        factoryRunId: "run-1",
      };

      await executor.run(params);

      expect(deps.runMockAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: "task-1",
          agentLabel: "Mock (Testing)",
        })
      );
    });

    it("passes env from profile to executor", async () => {
      const deps = createMockDeps();
      const executor = createAttemptExecutor(mockProfile, deps);

      const params: AttemptExecutionParams = {
        taskId: "task-1",
        projectId: "proj-1",
        factoryRunId: "run-1",
      };

      await executor.run(params);

      expect(deps.runClaudeAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          env: { FEATURE_REAL_AI: "true" },
        })
      );
    });

    it("returns result from underlying runner", async () => {
      const deps = createMockDeps({
        runClaudeAttempt: vi.fn().mockResolvedValue({
          success: true,
          attemptId: "attempt-xyz",
          exitCode: 0,
        }),
      });
      const executor = createAttemptExecutor(mockProfile, deps);

      const result = await executor.run({
        taskId: "task-1",
        projectId: "proj-1",
        factoryRunId: "run-1",
      });

      expect(result.success).toBe(true);
      expect(result.attemptId).toBe("attempt-xyz");
    });

    it("handles runner errors", async () => {
      const deps = createMockDeps({
        runClaudeAttempt: vi.fn().mockResolvedValue({
          success: false,
          attemptId: null,
          error: "API rate limit",
        }),
      });
      const executor = createAttemptExecutor(mockProfile, deps);

      const result = await executor.run({
        taskId: "task-1",
        projectId: "proj-1",
        factoryRunId: "run-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("API rate limit");
    });

    it("includes profileId in execution params", async () => {
      const deps = createMockDeps();
      const executor = createAttemptExecutor(mockProfile, deps);

      await executor.run({
        taskId: "task-1",
        projectId: "proj-1",
        factoryRunId: "run-1",
      });

      expect(deps.runClaudeAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          profileId: "claude-default",
        })
      );
    });
  });
});
