/** Attempt PR Publisher Tests (PR-97) - TDD first */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  publishAttemptPullRequest,
  type AttemptPrPublisherDeps,
  type PublishAttemptPrResult,
} from "../attempt-pr-publisher";

const createMockDeps = (overrides: Partial<AttemptPrPublisherDeps> = {}): AttemptPrPublisherDeps => ({
  getAttemptById: vi.fn().mockResolvedValue({
    id: "attempt-1",
    status: "completed",
    prUrl: null,
    branchName: "vibe/task-123",
    headCommit: "abc123",
    taskTitle: "Add login feature",
  }),
  hasDiffArtifact: vi.fn().mockResolvedValue(true),
  createPullRequest: vi.fn().mockResolvedValue({ prUrl: "https://github.com/org/repo/pull/42" }),
  setAttemptPrUrl: vi.fn().mockResolvedValue(undefined),
  getRepoPath: vi.fn().mockResolvedValue("/path/to/repo"),
  getBaseBranch: vi.fn().mockResolvedValue("main"),
  ...overrides,
});

describe("publishAttemptPullRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: attempt not found → PR_CREATE_FAILED
  it("returns PR_CREATE_FAILED when attempt not found", async () => {
    const deps = createMockDeps({
      getAttemptById: vi.fn().mockResolvedValue(null),
    });

    const result = await publishAttemptPullRequest(deps, "attempt-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("PR_CREATE_FAILED");
      expect(result.message).toContain("not found");
    }
  });

  // Test 2: already has prUrl → ALREADY_HAS_PR
  it("returns ALREADY_HAS_PR when attempt already has prUrl", async () => {
    const deps = createMockDeps({
      getAttemptById: vi.fn().mockResolvedValue({
        id: "attempt-1",
        status: "completed",
        prUrl: "https://github.com/org/repo/pull/1",
        branchName: "vibe/task-123",
        headCommit: "abc123",
      }),
    });

    const result = await publishAttemptPullRequest(deps, "attempt-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ALREADY_HAS_PR");
    }
    expect(deps.createPullRequest).not.toHaveBeenCalled();
  });

  // Test 3: status not completed → NOT_SUCCESS
  it("returns NOT_SUCCESS when status is not completed", async () => {
    const deps = createMockDeps({
      getAttemptById: vi.fn().mockResolvedValue({
        id: "attempt-1",
        status: "failed",
        prUrl: null,
        branchName: "vibe/task-123",
      }),
    });

    const result = await publishAttemptPullRequest(deps, "attempt-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_SUCCESS");
    }
  });

  // Test 4: no diff → EMPTY_DIFF
  it("returns EMPTY_DIFF when no diff artifact exists", async () => {
    const deps = createMockDeps({
      hasDiffArtifact: vi.fn().mockResolvedValue(false),
    });

    const result = await publishAttemptPullRequest(deps, "attempt-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("EMPTY_DIFF");
    }
  });

  // Test 5: missing branchName → PR_CREATE_FAILED
  it("returns PR_CREATE_FAILED when branchName is missing", async () => {
    const deps = createMockDeps({
      getAttemptById: vi.fn().mockResolvedValue({
        id: "attempt-1",
        status: "completed",
        prUrl: null,
        branchName: null,
        headCommit: "abc123",
      }),
    });

    const result = await publishAttemptPullRequest(deps, "attempt-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("PR_CREATE_FAILED");
      expect(result.message).toContain("branch");
    }
  });

  // Test 6: createPullRequest throws "gh not found" → PR_CREATION_UNAVAILABLE
  it("returns PR_CREATION_UNAVAILABLE when gh CLI not found", async () => {
    const deps = createMockDeps({
      createPullRequest: vi.fn().mockRejectedValue(new Error("gh: command not found")),
    });

    const result = await publishAttemptPullRequest(deps, "attempt-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("PR_CREATION_UNAVAILABLE");
    }
  });

  // Test 7: createPullRequest throws generic error → PR_CREATE_FAILED
  it("returns PR_CREATE_FAILED when createPullRequest throws generic error", async () => {
    const deps = createMockDeps({
      createPullRequest: vi.fn().mockRejectedValue(new Error("Network error")),
    });

    const result = await publishAttemptPullRequest(deps, "attempt-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("PR_CREATE_FAILED");
      expect(result.message).toContain("Network error");
    }
  });

  // Test 8: happy path - creates PR and sets prUrl
  it("creates PR and returns prUrl on success", async () => {
    const deps = createMockDeps();

    const result = await publishAttemptPullRequest(deps, "attempt-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prUrl).toBe("https://github.com/org/repo/pull/42");
    }
    expect(deps.createPullRequest).toHaveBeenCalledTimes(1);
    expect(deps.setAttemptPrUrl).toHaveBeenCalledWith("attempt-1", "https://github.com/org/repo/pull/42");
  });

  // Test 9: idempotency - second call returns ALREADY_HAS_PR
  it("returns ALREADY_HAS_PR on second call (idempotent)", async () => {
    let callCount = 0;
    const deps = createMockDeps({
      getAttemptById: vi.fn().mockImplementation(async () => {
        callCount++;
        return {
          id: "attempt-1",
          status: "completed",
          prUrl: callCount > 1 ? "https://github.com/org/repo/pull/42" : null,
          branchName: "vibe/task-123",
          headCommit: "abc123",
          taskTitle: "Add feature",
        };
      }),
    });

    // First call succeeds
    const result1 = await publishAttemptPullRequest(deps, "attempt-1");
    expect(result1.ok).toBe(true);

    // Second call returns ALREADY_HAS_PR
    const result2 = await publishAttemptPullRequest(deps, "attempt-1");
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.code).toBe("ALREADY_HAS_PR");
    }

    // createPullRequest called only once
    expect(deps.createPullRequest).toHaveBeenCalledTimes(1);
  });

  // Test 10: setAttemptPrUrl called with correct URL
  it("calls setAttemptPrUrl with the returned PR URL", async () => {
    const mockSetPrUrl = vi.fn().mockResolvedValue(undefined);
    const deps = createMockDeps({
      setAttemptPrUrl: mockSetPrUrl,
      createPullRequest: vi.fn().mockResolvedValue({ prUrl: "https://github.com/test/repo/pull/99" }),
    });

    await publishAttemptPullRequest(deps, "attempt-42");

    expect(mockSetPrUrl).toHaveBeenCalledWith("attempt-42", "https://github.com/test/repo/pull/99");
  });

  // Test 11: PR title includes task title when available
  it("creates PR with task title in the title", async () => {
    const mockCreate = vi.fn().mockResolvedValue({ prUrl: "https://github.com/org/repo/pull/1" });
    const deps = createMockDeps({
      createPullRequest: mockCreate,
    });

    await publishAttemptPullRequest(deps, "attempt-1");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Add login feature"),
      })
    );
  });
});
