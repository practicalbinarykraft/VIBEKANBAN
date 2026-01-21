/** Factory Worktree GC Service Tests (PR-108) - TDD */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  runWorktreeGC,
  maybeRunWorktreeGC,
  type WorktreeGCDeps,
  GC_DELAY_MS,
} from "../factory-worktree-gc.service";

function createMockDeps(overrides: Partial<WorktreeGCDeps> = {}): WorktreeGCDeps {
  return {
    getOrphanedAttempts: vi.fn().mockResolvedValue([]),
    pathExists: vi.fn().mockReturnValue(true),
    removeWorktree: vi.fn().mockResolvedValue({ ok: true }),
    deleteBranch: vi.fn().mockResolvedValue({ ok: true }),
    log: vi.fn(),
    now: vi.fn().mockReturnValue(Date.now()),
    ...overrides,
  };
}

describe("factory-worktree-gc.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runWorktreeGC", () => {
    it("does NOT delete running attempt worktree", async () => {
      const removeWorktree = vi.fn();
      const deps = createMockDeps({
        getOrphanedAttempts: vi.fn().mockResolvedValue([
          { id: "att-1", status: "running", finishedAt: null, worktreePath: "/tmp/wt-1", branchName: "b-1", repoPath: "/repo" },
        ]),
        removeWorktree,
      });

      await runWorktreeGC("proj-1", deps);

      expect(removeWorktree).not.toHaveBeenCalled();
    });

    it("does NOT delete queued attempt worktree", async () => {
      const removeWorktree = vi.fn();
      const deps = createMockDeps({
        getOrphanedAttempts: vi.fn().mockResolvedValue([
          { id: "att-1", status: "queued", finishedAt: null, worktreePath: "/tmp/wt-1", branchName: "b-1", repoPath: "/repo" },
        ]),
        removeWorktree,
      });

      await runWorktreeGC("proj-1", deps);

      expect(removeWorktree).not.toHaveBeenCalled();
    });

    it("does NOT delete attempt finished less than GC_DELAY ago", async () => {
      const now = Date.now();
      const recentFinish = new Date(now - GC_DELAY_MS + 60000); // 1 min before delay expires
      const removeWorktree = vi.fn();
      const deps = createMockDeps({
        getOrphanedAttempts: vi.fn().mockResolvedValue([
          { id: "att-1", status: "completed", finishedAt: recentFinish, worktreePath: "/tmp/wt-1", branchName: "b-1", repoPath: "/repo" },
        ]),
        removeWorktree,
        now: vi.fn().mockReturnValue(now),
      });

      await runWorktreeGC("proj-1", deps);

      expect(removeWorktree).not.toHaveBeenCalled();
    });

    it("deletes attempt finished more than GC_DELAY ago", async () => {
      const now = Date.now();
      const oldFinish = new Date(now - GC_DELAY_MS - 60000); // 1 min after delay expired
      const removeWorktree = vi.fn().mockResolvedValue({ ok: true });
      const deleteBranch = vi.fn().mockResolvedValue({ ok: true });
      const deps = createMockDeps({
        getOrphanedAttempts: vi.fn().mockResolvedValue([
          { id: "att-1", status: "completed", finishedAt: oldFinish, worktreePath: "/tmp/wt-1", branchName: "b-1", repoPath: "/repo" },
        ]),
        removeWorktree,
        deleteBranch,
        now: vi.fn().mockReturnValue(now),
      });

      await runWorktreeGC("proj-1", deps);

      expect(removeWorktree).toHaveBeenCalledWith("/repo", "/tmp/wt-1");
      expect(deleteBranch).toHaveBeenCalledWith("/repo", "b-1");
    });

    it("skips attempt when worktreePath does not exist on disk", async () => {
      const now = Date.now();
      const oldFinish = new Date(now - GC_DELAY_MS - 60000);
      const removeWorktree = vi.fn();
      const deps = createMockDeps({
        getOrphanedAttempts: vi.fn().mockResolvedValue([
          { id: "att-1", status: "failed", finishedAt: oldFinish, worktreePath: "/tmp/wt-missing", branchName: "b-1", repoPath: "/repo" },
        ]),
        pathExists: vi.fn().mockReturnValue(false),
        removeWorktree,
        now: vi.fn().mockReturnValue(now),
      });

      await runWorktreeGC("proj-1", deps);

      expect(removeWorktree).not.toHaveBeenCalled();
    });

    it("swallows git error and logs it", async () => {
      const now = Date.now();
      const oldFinish = new Date(now - GC_DELAY_MS - 60000);
      const log = vi.fn();
      const removeWorktree = vi.fn().mockResolvedValue({ ok: false, error: "git error" });
      const deps = createMockDeps({
        getOrphanedAttempts: vi.fn().mockResolvedValue([
          { id: "att-1", status: "cancelled", finishedAt: oldFinish, worktreePath: "/tmp/wt-1", branchName: "b-1", repoPath: "/repo" },
        ]),
        removeWorktree,
        log,
        now: vi.fn().mockReturnValue(now),
      });

      // Should NOT throw
      await expect(runWorktreeGC("proj-1", deps)).resolves.not.toThrow();

      expect(log).toHaveBeenCalledWith(expect.stringContaining("git error"));
    });

    it("deletes multiple orphaned worktrees", async () => {
      const now = Date.now();
      const oldFinish = new Date(now - GC_DELAY_MS - 60000);
      const removeWorktree = vi.fn().mockResolvedValue({ ok: true });
      const deleteBranch = vi.fn().mockResolvedValue({ ok: true });
      const deps = createMockDeps({
        getOrphanedAttempts: vi.fn().mockResolvedValue([
          { id: "att-1", status: "completed", finishedAt: oldFinish, worktreePath: "/tmp/wt-1", branchName: "b-1", repoPath: "/repo" },
          { id: "att-2", status: "failed", finishedAt: oldFinish, worktreePath: "/tmp/wt-2", branchName: "b-2", repoPath: "/repo" },
          { id: "att-3", status: "cancelled", finishedAt: oldFinish, worktreePath: "/tmp/wt-3", branchName: "b-3", repoPath: "/repo" },
        ]),
        removeWorktree,
        deleteBranch,
        now: vi.fn().mockReturnValue(now),
      });

      await runWorktreeGC("proj-1", deps);

      expect(removeWorktree).toHaveBeenCalledTimes(3);
      expect(deleteBranch).toHaveBeenCalledTimes(3);
    });

    it("handles null branchName gracefully (skips branch deletion)", async () => {
      const now = Date.now();
      const oldFinish = new Date(now - GC_DELAY_MS - 60000);
      const removeWorktree = vi.fn().mockResolvedValue({ ok: true });
      const deleteBranch = vi.fn();
      const deps = createMockDeps({
        getOrphanedAttempts: vi.fn().mockResolvedValue([
          { id: "att-1", status: "completed", finishedAt: oldFinish, worktreePath: "/tmp/wt-1", branchName: null, repoPath: "/repo" },
        ]),
        removeWorktree,
        deleteBranch,
        now: vi.fn().mockReturnValue(now),
      });

      await runWorktreeGC("proj-1", deps);

      expect(removeWorktree).toHaveBeenCalled();
      expect(deleteBranch).not.toHaveBeenCalled();
    });
  });

  describe("maybeRunWorktreeGC (with lock)", () => {
    it("prevents concurrent GC for same project", async () => {
      const now = Date.now();
      const oldFinish = new Date(now - GC_DELAY_MS - 60000);
      let callCount = 0;
      const slowRemoveWorktree = vi.fn().mockImplementation(async () => {
        callCount++;
        await new Promise((r) => setTimeout(r, 50));
        return { ok: true };
      });
      const deps = createMockDeps({
        getOrphanedAttempts: vi.fn().mockResolvedValue([
          { id: "att-1", status: "completed", finishedAt: oldFinish, worktreePath: "/tmp/wt-1", branchName: "b-1", repoPath: "/repo" },
        ]),
        removeWorktree: slowRemoveWorktree,
        now: vi.fn().mockReturnValue(now),
      });

      // Start two GC runs concurrently
      const [result1, result2] = await Promise.all([
        maybeRunWorktreeGC("proj-lock-test", deps),
        maybeRunWorktreeGC("proj-lock-test", deps),
      ]);

      // One should run, one should skip
      expect([result1.skipped, result2.skipped]).toContain(true);
      expect(callCount).toBe(1);
    });

    it("allows GC for different projects concurrently", async () => {
      const now = Date.now();
      const oldFinish = new Date(now - GC_DELAY_MS - 60000);
      const removeWorktree = vi.fn().mockResolvedValue({ ok: true });
      const deps = createMockDeps({
        getOrphanedAttempts: vi.fn().mockResolvedValue([
          { id: "att-1", status: "completed", finishedAt: oldFinish, worktreePath: "/tmp/wt-1", branchName: "b-1", repoPath: "/repo" },
        ]),
        removeWorktree,
        now: vi.fn().mockReturnValue(now),
      });

      const [result1, result2] = await Promise.all([
        maybeRunWorktreeGC("proj-a", deps),
        maybeRunWorktreeGC("proj-b", deps),
      ]);

      expect(result1.skipped).toBe(false);
      expect(result2.skipped).toBe(false);
      expect(removeWorktree).toHaveBeenCalledTimes(2);
    });
  });
});
