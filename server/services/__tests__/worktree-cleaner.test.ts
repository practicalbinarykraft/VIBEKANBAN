/**
 * Worktree Cleaner Tests (PR-71)
 * TDD: Tests written before implementation
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  cleanupAttemptWorkspace,
  type CleanupDeps,
} from "../execution/worktree-cleaner";

describe("cleanupAttemptWorkspace", () => {
  let mockRunGit: Mock<(args: string[], cwd?: string) => Promise<number>>;
  let mockRemoveDir: Mock<(path: string) => Promise<void>>;
  let deps: CleanupDeps;

  beforeEach(() => {
    mockRunGit = vi.fn<(args: string[], cwd?: string) => Promise<number>>();
    mockRemoveDir = vi.fn<(path: string) => Promise<void>>();
    deps = { runGit: mockRunGit, removeDir: mockRemoveDir };
  });

  it("successfully cleans worktree and directory", async () => {
    mockRunGit.mockResolvedValueOnce(0); // worktree remove
    mockRemoveDir.mockResolvedValueOnce(undefined);

    const result = await cleanupAttemptWorkspace(
      { attemptId: "test-1", workspacePath: "/tmp/worktree/test-1" },
      deps
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.removedWorktree).toBe(true);
      expect(result.removedDir).toBe(true);
    }
    expect(mockRunGit).toHaveBeenCalledWith(
      ["worktree", "remove", "--force", "/tmp/worktree/test-1"],
      undefined
    );
  });

  it("returns error when worktree remove fails", async () => {
    mockRunGit.mockResolvedValueOnce(1); // worktree remove fails

    const result = await cleanupAttemptWorkspace(
      { attemptId: "test-2", workspacePath: "/tmp/worktree/test-2" },
      deps
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.step).toBe("worktree");
    }
    expect(mockRemoveDir).not.toHaveBeenCalled();
  });

  it("returns error when directory removal fails", async () => {
    mockRunGit.mockResolvedValueOnce(0); // worktree ok
    mockRemoveDir.mockRejectedValueOnce(new Error("ENOENT"));

    const result = await cleanupAttemptWorkspace(
      { attemptId: "test-3", workspacePath: "/tmp/worktree/test-3" },
      deps
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.step).toBe("dir");
    }
  });

  it("cleans branch and handles branch delete failure gracefully", async () => {
    mockRunGit
      .mockResolvedValueOnce(0) // worktree remove ok
      .mockResolvedValueOnce(1); // branch delete fails
    mockRemoveDir.mockResolvedValueOnce(undefined);

    const result = await cleanupAttemptWorkspace(
      {
        attemptId: "test-4",
        workspacePath: "/tmp/worktree/test-4",
        branchName: "attempt/test-4",
      },
      deps
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.removedWorktree).toBe(true);
      expect(result.removedDir).toBe(true);
      expect(result.removedBranch).toBe(false);
    }
  });

  it("successfully removes branch when branch delete succeeds", async () => {
    mockRunGit
      .mockResolvedValueOnce(0) // worktree remove ok
      .mockResolvedValueOnce(0); // branch delete ok
    mockRemoveDir.mockResolvedValueOnce(undefined);

    const result = await cleanupAttemptWorkspace(
      {
        attemptId: "test-5",
        workspacePath: "/tmp/worktree/test-5",
        branchName: "attempt/test-5",
      },
      deps
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.removedBranch).toBe(true);
    }
  });

  it("skips branch deletion for protected branches", async () => {
    mockRunGit.mockResolvedValueOnce(0); // worktree remove
    mockRemoveDir.mockResolvedValueOnce(undefined);

    const result = await cleanupAttemptWorkspace(
      {
        attemptId: "test-6",
        workspacePath: "/tmp/worktree/test-6",
        branchName: "main",
      },
      deps
    );

    expect(result.ok).toBe(true);
    expect(mockRunGit).toHaveBeenCalledTimes(1);
  });
});
