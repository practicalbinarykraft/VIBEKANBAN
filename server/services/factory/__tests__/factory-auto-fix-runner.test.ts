/** Factory Auto-Fix Runner Tests (PR-99) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runAutofixAttempt,
  type AutofixRunnerDeps,
  type PrWithCiStatus,
} from "../factory-auto-fix-runner";

function createMockDeps(overrides: Partial<AutofixRunnerDeps> = {}): AutofixRunnerDeps {
  return {
    checkoutPrBranch: vi.fn().mockResolvedValue({ success: true, output: "Switched to branch" }),
    runTests: vi.fn().mockResolvedValue({ success: true, output: "Tests passed", exitCode: 0 }),
    getProjectPath: vi.fn().mockReturnValue("/tmp/repo"),
    ...overrides,
  };
}

const mockPr: PrWithCiStatus = {
  taskId: "task-1",
  attemptId: "attempt-1",
  prUrl: "https://github.com/org/repo/pull/1",
  commitSha: "abc123",
  ciStatus: "failed",
  branchName: "fix/task-1",
};

describe("factory-auto-fix-runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks out PR branch before running tests", async () => {
    const deps = createMockDeps();

    await runAutofixAttempt(mockPr, deps);

    expect(deps.checkoutPrBranch).toHaveBeenCalledWith(mockPr.prUrl, "/tmp/repo");
  });

  it("runs tests after successful checkout", async () => {
    const deps = createMockDeps();

    await runAutofixAttempt(mockPr, deps);

    expect(deps.runTests).toHaveBeenCalledWith("/tmp/repo");
  });

  it("returns success when tests pass", async () => {
    const deps = createMockDeps({
      runTests: vi.fn().mockResolvedValue({ success: true, output: "All tests passed", exitCode: 0 }),
    });

    const result = await runAutofixAttempt(mockPr, deps);

    expect(result.success).toBe(true);
    expect(result.logs).toContain("All tests passed");
  });

  it("returns failure when tests fail", async () => {
    const deps = createMockDeps({
      runTests: vi.fn().mockResolvedValue({ success: false, output: "Test failed at line 42", exitCode: 1 }),
    });

    const result = await runAutofixAttempt(mockPr, deps);

    expect(result.success).toBe(false);
    expect(result.logs).toContain("Test failed at line 42");
  });

  it("returns failure when checkout fails", async () => {
    const deps = createMockDeps({
      checkoutPrBranch: vi.fn().mockResolvedValue({ success: false, output: "Branch not found" }),
    });

    const result = await runAutofixAttempt(mockPr, deps);

    expect(result.success).toBe(false);
    expect(result.logs).toContain("Branch not found");
    expect(deps.runTests).not.toHaveBeenCalled();
  });

  it("captures combined output from checkout and tests", async () => {
    const deps = createMockDeps({
      checkoutPrBranch: vi.fn().mockResolvedValue({ success: true, output: "Checkout OK" }),
      runTests: vi.fn().mockResolvedValue({ success: true, output: "Tests OK", exitCode: 0 }),
    });

    const result = await runAutofixAttempt(mockPr, deps);

    expect(result.logs).toContain("Checkout OK");
    expect(result.logs).toContain("Tests OK");
  });

  it("handles exception in checkout gracefully", async () => {
    const deps = createMockDeps({
      checkoutPrBranch: vi.fn().mockRejectedValue(new Error("Network error")),
    });

    const result = await runAutofixAttempt(mockPr, deps);

    expect(result.success).toBe(false);
    expect(result.logs).toContain("Network error");
  });

  it("handles exception in tests gracefully", async () => {
    const deps = createMockDeps({
      runTests: vi.fn().mockRejectedValue(new Error("Process killed")),
    });

    const result = await runAutofixAttempt(mockPr, deps);

    expect(result.success).toBe(false);
    expect(result.logs).toContain("Process killed");
  });
});
