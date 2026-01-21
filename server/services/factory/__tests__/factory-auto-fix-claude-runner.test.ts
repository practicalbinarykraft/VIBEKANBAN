/** Factory Auto-Fix Claude Runner Tests (PR-100) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runClaudeAutofix,
  type ClaudeRunnerDeps,
  type ClaudeFixContext,
  type ClaudeFixResult,
} from "../factory-auto-fix-claude-runner";

function createMockDeps(overrides: Partial<ClaudeRunnerDeps> = {}): ClaudeRunnerDeps {
  return {
    checkoutPrBranch: vi.fn().mockResolvedValue({ success: true, output: "Checked out" }),
    runClaudeCode: vi.fn().mockResolvedValue({ success: true, output: "Fixed code" }),
    getChangedFiles: vi.fn().mockResolvedValue(["src/foo.ts"]),
    runTests: vi.fn().mockResolvedValue({ success: true, output: "Tests passed" }),
    commitAndPush: vi.fn().mockResolvedValue({ success: true, output: "abc123", commitSha: "abc123" }),
    getProjectPath: vi.fn().mockReturnValue("/tmp/repo"),
    ...overrides,
  };
}

const mockContext: ClaudeFixContext = {
  prUrl: "https://github.com/org/repo/pull/42",
  prNumber: 42,
  branchName: "fix/issue-42",
  failureType: "Unit_test_failure",
  summary: "Test failed",
  logSnippet: "FAIL test.ts",
};

describe("factory-auto-fix-claude-runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks out PR branch first", async () => {
    const deps = createMockDeps();
    await runClaudeAutofix(mockContext, deps);
    expect(deps.checkoutPrBranch).toHaveBeenCalledWith("https://github.com/org/repo/pull/42", "/tmp/repo");
  });

  it("runs Claude Code after checkout", async () => {
    const deps = createMockDeps();
    await runClaudeAutofix(mockContext, deps);
    expect(deps.runClaudeCode).toHaveBeenCalled();
  });

  it("returns ok:true with commitSha when fix succeeds", async () => {
    const deps = createMockDeps();
    const result = await runClaudeAutofix(mockContext, deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.commitSha).toBe("abc123");
      expect(result.changedFiles).toEqual(["src/foo.ts"]);
    }
  });

  it("returns NO_CHANGES when no files changed", async () => {
    const deps = createMockDeps({
      getChangedFiles: vi.fn().mockResolvedValue([]),
    });
    const result = await runClaudeAutofix(mockContext, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NO_CHANGES");
    }
  });

  it("returns CLAUDE_FAILED when Claude Code fails", async () => {
    const deps = createMockDeps({
      runClaudeCode: vi.fn().mockResolvedValue({ success: false, output: "Claude error" }),
    });
    const result = await runClaudeAutofix(mockContext, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("CLAUDE_FAILED");
    }
  });

  it("returns TESTS_FAILED when tests fail after fix", async () => {
    const deps = createMockDeps({
      runTests: vi.fn().mockResolvedValue({ success: false, output: "Test failed" }),
    });
    const result = await runClaudeAutofix(mockContext, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("TESTS_FAILED");
    }
  });

  it("returns GIT_FAILED when commit/push fails", async () => {
    const deps = createMockDeps({
      commitAndPush: vi.fn().mockResolvedValue({ success: false, output: "Push rejected" }),
    });
    const result = await runClaudeAutofix(mockContext, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("GIT_FAILED");
    }
  });

  it("handles checkout failure gracefully", async () => {
    const deps = createMockDeps({
      checkoutPrBranch: vi.fn().mockResolvedValue({ success: false, output: "Branch not found" }),
    });
    const result = await runClaudeAutofix(mockContext, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("GIT_FAILED");
    }
  });

  it("handles exception in Claude Code gracefully", async () => {
    const deps = createMockDeps({
      runClaudeCode: vi.fn().mockRejectedValue(new Error("Network error")),
    });
    const result = await runClaudeAutofix(mockContext, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("CLAUDE_FAILED");
      expect(result.details).toContain("Network error");
    }
  });

  it("skips tests and commit when no changes after Claude", async () => {
    const deps = createMockDeps({
      getChangedFiles: vi.fn().mockResolvedValue([]),
    });
    await runClaudeAutofix(mockContext, deps);
    expect(deps.runTests).not.toHaveBeenCalled();
    expect(deps.commitAndPush).not.toHaveBeenCalled();
  });

  it("includes prNumber in commit message", async () => {
    const deps = createMockDeps();
    await runClaudeAutofix(mockContext, deps);
    expect(deps.commitAndPush).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("42"),
      expect.any(String)
    );
  });
});
