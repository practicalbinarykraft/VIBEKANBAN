/** Factory Preflight Dependencies (PR-101) - Real implementations for DI */
import { db } from "@/server/db";
import { autopilotRuns } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { spawn } from "child_process";
import type { PreflightDeps } from "./factory-preflight.service";

async function execCommand(cmd: string, args: string[], cwd: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, shell: true });
    let output = "";

    proc.stdout.on("data", (data) => { output += data.toString(); });
    proc.stderr.on("data", (data) => { output += data.toString(); });

    proc.on("close", (code) => {
      resolve({ success: code === 0, output: output.trim() });
    });

    proc.on("error", (err) => {
      resolve({ success: false, output: err.message });
    });
  });
}

export function createPreflightDeps(): PreflightDeps {
  return {
    isRepoClean: async (repoPath: string): Promise<boolean> => {
      const result = await execCommand("git", ["status", "--porcelain"], repoPath);
      return result.success && result.output.length === 0;
    },

    defaultBranchExists: async (repoPath: string): Promise<boolean> => {
      // Check for main or master branch
      const mainResult = await execCommand("git", ["rev-parse", "--verify", "main"], repoPath);
      if (mainResult.success) return true;
      const masterResult = await execCommand("git", ["rev-parse", "--verify", "master"], repoPath);
      return masterResult.success;
    },

    isGhCliAvailable: async (): Promise<boolean> => {
      const result = await execCommand("gh", ["auth", "status"], process.cwd());
      return result.success;
    },

    hasPushPermission: async (repoPath: string): Promise<boolean> => {
      // Check if user can push (dry-run)
      const result = await execCommand("git", ["push", "--dry-run"], repoPath);
      return result.success || result.output.includes("Everything up-to-date");
    },

    isBudgetOk: async (_projectId: string): Promise<boolean> => {
      // Budget check - for now always returns true
      // Can be extended to check actual budget via API
      return true;
    },

    hasActiveRun: async (projectId: string): Promise<boolean> => {
      const activeRuns = await db.select().from(autopilotRuns)
        .where(
          and(
            eq(autopilotRuns.projectId, projectId),
            inArray(autopilotRuns.status, ["running", "pending"])
          )
        );
      return activeRuns.length > 0;
    },
  };
}
