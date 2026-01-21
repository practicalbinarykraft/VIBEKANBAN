/** Factory Auto-Fix Claude Dependencies (PR-100) - Real implementations */
import { spawn } from "child_process";
import type { ClaudeRunnerDeps, CommandResult } from "./factory-auto-fix-claude-runner";

const CLAUDE_TIMEOUT = 180000; // 3 minutes
const TEST_TIMEOUT = 120000; // 2 minutes

async function execCommand(
  cmd: string,
  args: string[],
  cwd: string,
  timeout = 60000,
  env?: Record<string, string>
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      cwd,
      shell: true,
      env: { ...process.env, ...env },
    });

    let output = "";
    const timer = setTimeout(() => {
      proc.kill();
      resolve({ success: false, output: "Command timed out" });
    }, timeout);

    proc.stdout.on("data", (data) => { output += data.toString(); });
    proc.stderr.on("data", (data) => { output += data.toString(); });

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ success: code === 0, output: output.slice(-2000) });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ success: false, output: err.message });
    });
  });
}

export function createClaudeRunnerDeps(projectPath: string): ClaudeRunnerDeps {
  return {
    getProjectPath: () => projectPath,

    checkoutPrBranch: async (prUrl: string, cwd: string) => {
      const match = prUrl.match(/\/pull\/(\d+)/);
      if (!match) {
        return { success: false, output: "Invalid PR URL" };
      }
      return execCommand("gh", ["pr", "checkout", match[1]], cwd);
    },

    runClaudeCode: async (prompt: string, cwd: string) => {
      // Use npx to run Claude Code with the prompt
      const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/`/g, "\\`");
      return execCommand(
        "npx",
        ["-y", "@anthropic-ai/claude-code", `"${escapedPrompt}"`],
        cwd,
        CLAUDE_TIMEOUT,
        { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "" }
      );
    },

    getChangedFiles: async (cwd: string) => {
      const result = await execCommand("git", ["status", "--porcelain"], cwd);
      if (!result.success || !result.output.trim()) {
        return [];
      }
      return result.output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.slice(3).trim());
    },

    runTests: async (cwd: string) => {
      // Run unit tests + TypeScript check
      const tscResult = await execCommand("npx", ["tsc", "--noEmit"], cwd, TEST_TIMEOUT);
      if (!tscResult.success) {
        return tscResult;
      }
      return execCommand("npm", ["run", "test:unit"], cwd, TEST_TIMEOUT);
    },

    commitAndPush: async (cwd: string, message: string, branchName: string) => {
      // Stage all changes
      const addResult = await execCommand("git", ["add", "-A"], cwd);
      if (!addResult.success) return addResult;

      // Commit
      const commitResult = await execCommand("git", ["commit", "-m", message], cwd);
      if (!commitResult.success) return commitResult;

      // Get commit SHA
      const shaResult = await execCommand("git", ["rev-parse", "HEAD"], cwd);
      const commitSha = shaResult.output.trim().slice(0, 7);

      // Push
      const pushResult = await execCommand("git", ["push", "origin", branchName], cwd);
      if (!pushResult.success) return pushResult;

      return { success: true, output: commitSha, commitSha };
    },
  };
}
