/** Factory Preflight Service Tests (PR-101) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runPreflightChecks,
  type PreflightDeps,
  type PreflightConfig,
  type PreflightResult,
  type PreflightCheckItem,
} from "../factory-preflight.service";
import { FactoryErrorCode } from "@/types/factory-errors";

function createMockDeps(overrides: Partial<PreflightDeps> = {}): PreflightDeps {
  return {
    isRepoClean: vi.fn().mockResolvedValue(true),
    defaultBranchExists: vi.fn().mockResolvedValue(true),
    isGhCliAvailable: vi.fn().mockResolvedValue(true),
    hasPushPermission: vi.fn().mockResolvedValue(true),
    isBudgetOk: vi.fn().mockResolvedValue(true),
    hasActiveRun: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

const validConfig: PreflightConfig = {
  projectId: "proj-1",
  repoPath: "/path/to/repo",
  maxParallel: 5,
};

describe("factory-preflight.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok=true when all checks pass", async () => {
    const deps = createMockDeps();
    const result = await runPreflightChecks(validConfig, deps);

    expect(result.ok).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("fails when repo is dirty", async () => {
    const deps = createMockDeps({
      isRepoClean: vi.fn().mockResolvedValue(false),
    });

    const result = await runPreflightChecks(validConfig, deps);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe(FactoryErrorCode.FACTORY_REPO_DIRTY);
    const repoCheck = result.checks.find((c) => c.name === "repo_clean");
    expect(repoCheck?.passed).toBe(false);
  });

  it("fails when default branch does not exist", async () => {
    const deps = createMockDeps({
      defaultBranchExists: vi.fn().mockResolvedValue(false),
    });

    const result = await runPreflightChecks(validConfig, deps);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe(FactoryErrorCode.FACTORY_NO_DEFAULT_BRANCH);
  });

  it("fails when gh CLI is not available", async () => {
    const deps = createMockDeps({
      isGhCliAvailable: vi.fn().mockResolvedValue(false),
    });

    const result = await runPreflightChecks(validConfig, deps);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe(FactoryErrorCode.FACTORY_GH_NOT_AUTHED);
  });

  it("fails when user has no push permission", async () => {
    const deps = createMockDeps({
      hasPushPermission: vi.fn().mockResolvedValue(false),
    });

    const result = await runPreflightChecks(validConfig, deps);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe(FactoryErrorCode.FACTORY_PERMISSION_DENIED);
  });

  it("fails when budget exceeded", async () => {
    const deps = createMockDeps({
      isBudgetOk: vi.fn().mockResolvedValue(false),
    });

    const result = await runPreflightChecks(validConfig, deps);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe(FactoryErrorCode.FACTORY_BUDGET_EXCEEDED);
  });

  it("fails when factory already running for project", async () => {
    const deps = createMockDeps({
      hasActiveRun: vi.fn().mockResolvedValue(true),
    });

    const result = await runPreflightChecks(validConfig, deps);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe(FactoryErrorCode.FACTORY_ALREADY_RUNNING);
  });

  it("fails when maxParallel < 1", async () => {
    const deps = createMockDeps();
    const config = { ...validConfig, maxParallel: 0 };

    const result = await runPreflightChecks(config, deps);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe(FactoryErrorCode.FACTORY_INVALID_CONFIG);
  });

  it("fails when maxParallel > 20", async () => {
    const deps = createMockDeps();
    const config = { ...validConfig, maxParallel: 21 };

    const result = await runPreflightChecks(config, deps);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe(FactoryErrorCode.FACTORY_INVALID_CONFIG);
  });

  it("accepts maxParallel=1 (edge case)", async () => {
    const deps = createMockDeps();
    const config = { ...validConfig, maxParallel: 1 };

    const result = await runPreflightChecks(config, deps);

    expect(result.ok).toBe(true);
  });

  it("accepts maxParallel=20 (edge case)", async () => {
    const deps = createMockDeps();
    const config = { ...validConfig, maxParallel: 20 };

    const result = await runPreflightChecks(config, deps);

    expect(result.ok).toBe(true);
  });

  it("returns all checks in result (for UI display)", async () => {
    const deps = createMockDeps();
    const result = await runPreflightChecks(validConfig, deps);

    const checkNames = result.checks.map((c) => c.name);
    expect(checkNames).toContain("repo_clean");
    expect(checkNames).toContain("default_branch");
    expect(checkNames).toContain("gh_cli");
    expect(checkNames).toContain("push_permission");
    expect(checkNames).toContain("budget");
    expect(checkNames).toContain("no_active_run");
    expect(checkNames).toContain("config_valid");
  });

  it("stops at first failure (fail-fast)", async () => {
    const isRepoCleanMock = vi.fn().mockResolvedValue(false);
    const defaultBranchMock = vi.fn().mockResolvedValue(true);
    const deps = createMockDeps({
      isRepoClean: isRepoCleanMock,
      defaultBranchExists: defaultBranchMock,
    });

    await runPreflightChecks(validConfig, deps);

    expect(isRepoCleanMock).toHaveBeenCalled();
    // defaultBranchExists should not be called after repo_clean fails
    expect(defaultBranchMock).not.toHaveBeenCalled();
  });

  it("handles check exception gracefully", async () => {
    const deps = createMockDeps({
      isRepoClean: vi.fn().mockRejectedValue(new Error("Git not found")),
    });

    const result = await runPreflightChecks(validConfig, deps);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe(FactoryErrorCode.FACTORY_PREFLIGHT_FAILED);
  });
});
