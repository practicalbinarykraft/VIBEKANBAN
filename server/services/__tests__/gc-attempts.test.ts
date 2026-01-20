/**
 * GC Attempts Tests (PR-71)
 * TDD: Tests for garbage collection of stale attempt workspaces
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { gcAttemptWorkspaces, type GcDeps, type StaleAttempt } from "../execution/gc-attempts";
import type { CleanupResult, CleanupParams } from "../execution/worktree-cleaner";

describe("gcAttemptWorkspaces", () => {
  let mockFindStaleAttempts: GcDeps["findStaleAttempts"];
  let mockCleanup: GcDeps["cleanup"];
  let deps: GcDeps;

  beforeEach(() => {
    mockFindStaleAttempts = vi.fn();
    mockCleanup = vi.fn();
    deps = { findStaleAttempts: mockFindStaleAttempts, cleanup: mockCleanup };
  });

  it("returns empty report when no stale attempts found", async () => {
    (mockFindStaleAttempts as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const result = await gcAttemptWorkspaces({ minAgeMinutes: 60, limit: 25 }, deps);

    expect(result.checked).toBe(0);
    expect(result.cleaned).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.failures).toEqual([]);
  });

  it("cleans stale attempts and returns success count", async () => {
    (mockFindStaleAttempts as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: "a1", worktreePath: "/tmp/w1", branchName: "b1" },
      { id: "a2", worktreePath: "/tmp/w2", branchName: "b2" },
    ]);
    (mockCleanup as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, removedWorktree: true, removedDir: true, removedBranch: true,
    });

    const result = await gcAttemptWorkspaces({ minAgeMinutes: 60, limit: 25 }, deps);

    expect(result.checked).toBe(2);
    expect(result.cleaned).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("tracks failures in report", async () => {
    const mockFind = mockFindStaleAttempts as ReturnType<typeof vi.fn>;
    const mockClean = mockCleanup as ReturnType<typeof vi.fn>;
    mockFind.mockResolvedValueOnce([
      { id: "a1", worktreePath: "/tmp/w1", branchName: "b1" },
      { id: "a2", worktreePath: "/tmp/w2", branchName: "b2" },
      { id: "a3", worktreePath: "/tmp/w3", branchName: "b3" },
    ]);
    mockClean
      .mockResolvedValueOnce({ ok: true, removedWorktree: true, removedDir: true, removedBranch: true })
      .mockResolvedValueOnce({ ok: false, step: "worktree", error: "failed" })
      .mockResolvedValueOnce({ ok: true, removedWorktree: true, removedDir: true, removedBranch: false });

    const result = await gcAttemptWorkspaces({ minAgeMinutes: 60, limit: 25 }, deps);

    expect(result.checked).toBe(3);
    expect(result.cleaned).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toEqual({ attemptId: "a2", reason: "failed" });
  });

  it("respects limit parameter", async () => {
    const mockFind = mockFindStaleAttempts as ReturnType<typeof vi.fn>;
    const mockClean = mockCleanup as ReturnType<typeof vi.fn>;
    mockFind.mockResolvedValueOnce([{ id: "a1", worktreePath: "/tmp/w1" }]);
    mockClean.mockResolvedValue({
      ok: true, removedWorktree: true, removedDir: true, removedBranch: false,
    });

    await gcAttemptWorkspaces({ minAgeMinutes: 30, limit: 10 }, deps);

    expect(mockFind).toHaveBeenCalledWith(30, 10);
  });
});
