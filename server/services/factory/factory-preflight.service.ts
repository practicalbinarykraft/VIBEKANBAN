/** Factory Preflight Service (PR-101) - Validate before starting Factory Mode */
import { FactoryErrorCode } from "@/types/factory-errors";

export interface PreflightConfig {
  projectId: string;
  repoPath: string;
  maxParallel: number;
}

export interface PreflightDeps {
  isRepoClean: (repoPath: string) => Promise<boolean>;
  defaultBranchExists: (repoPath: string) => Promise<boolean>;
  isGhCliAvailable: () => Promise<boolean>;
  hasPushPermission: (repoPath: string) => Promise<boolean>;
  isBudgetOk: (projectId: string) => Promise<boolean>;
  hasActiveRun: (projectId: string) => Promise<boolean>;
}

export interface PreflightCheckItem {
  name: string;
  label: string;
  passed: boolean;
}

export interface PreflightResult {
  ok: boolean;
  errorCode?: FactoryErrorCode;
  errorMessage?: string;
  checks: PreflightCheckItem[];
}

interface CheckDefinition {
  name: string;
  label: string;
  run: () => Promise<boolean>;
  errorCode: FactoryErrorCode;
}

/**
 * Run all preflight checks before starting Factory Mode.
 * Fails fast on first error.
 */
export async function runPreflightChecks(
  config: PreflightConfig,
  deps: PreflightDeps
): Promise<PreflightResult> {
  const checks: PreflightCheckItem[] = [];

  // Validate config first (sync check)
  const configValid = config.maxParallel >= 1 && config.maxParallel <= 20;
  checks.push({ name: "config_valid", label: "Config valid", passed: configValid });
  if (!configValid) {
    return {
      ok: false,
      errorCode: FactoryErrorCode.FACTORY_INVALID_CONFIG,
      errorMessage: "maxParallel must be between 1 and 20",
      checks,
    };
  }

  const checkDefs: CheckDefinition[] = [
    {
      name: "repo_clean",
      label: "Repository clean",
      run: () => deps.isRepoClean(config.repoPath),
      errorCode: FactoryErrorCode.FACTORY_REPO_DIRTY,
    },
    {
      name: "default_branch",
      label: "Default branch exists",
      run: () => deps.defaultBranchExists(config.repoPath),
      errorCode: FactoryErrorCode.FACTORY_NO_DEFAULT_BRANCH,
    },
    {
      name: "gh_cli",
      label: "GitHub CLI available",
      run: () => deps.isGhCliAvailable(),
      errorCode: FactoryErrorCode.FACTORY_GH_NOT_AUTHED,
    },
    {
      name: "push_permission",
      label: "Push permission",
      run: () => deps.hasPushPermission(config.repoPath),
      errorCode: FactoryErrorCode.FACTORY_PERMISSION_DENIED,
    },
    {
      name: "budget",
      label: "Budget OK",
      run: () => deps.isBudgetOk(config.projectId),
      errorCode: FactoryErrorCode.FACTORY_BUDGET_EXCEEDED,
    },
    {
      name: "no_active_run",
      label: "No active run",
      run: async () => !(await deps.hasActiveRun(config.projectId)),
      errorCode: FactoryErrorCode.FACTORY_ALREADY_RUNNING,
    },
  ];

  // Run checks sequentially (fail-fast)
  for (const def of checkDefs) {
    try {
      const passed = await def.run();
      checks.push({ name: def.name, label: def.label, passed });

      if (!passed) {
        return {
          ok: false,
          errorCode: def.errorCode,
          errorMessage: def.label + " check failed",
          checks,
        };
      }
    } catch (err) {
      checks.push({ name: def.name, label: def.label, passed: false });
      return {
        ok: false,
        errorCode: FactoryErrorCode.FACTORY_PREFLIGHT_FAILED,
        errorMessage: err instanceof Error ? err.message : String(err),
        checks,
      };
    }
  }

  return { ok: true, checks };
}
