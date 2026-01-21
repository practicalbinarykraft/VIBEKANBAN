/** Factory Auto-Fix Prompt Builder (PR-100) - Generate Claude Code prompts */

export type FailureType = "TS_error" | "Unit_test_failure" | "Build_failed" | "E2E_failed" | "Unknown";

export interface PromptContext {
  failureType: FailureType;
  summary: string;
  logSnippet: string;
  prNumber: number;
}

const MAX_LOG_SNIPPET = 1000;

const ALLOWED_DIRS = [
  "server/",
  "lib/",
  "components/",
  "hooks/",
  "app/api/",
];

const STRICT_RULES = `
STRICT RULES (must follow):
1. Do NOT touch E2E tests (tests/e2e/**, *.spec.ts, *.e2e.ts)
2. Do NOT add new E2E tests
3. Do NOT change text strings unless necessary for the fix
4. Keep each file under 200 LOC (lines of code)
5. TDD: write/fix tests first if needed
6. Only modify files in: ${ALLOWED_DIRS.join(", ")}
7. Do NOT update package.json or dependencies
8. Do NOT add console.log, debugger, or test.skip/only
`;

/**
 * Build a deterministic prompt for Claude Code to fix CI failures.
 */
export function buildClaudeFixPrompt(context: PromptContext): string {
  const { failureType, summary, logSnippet, prNumber } = context;

  // Truncate log snippet
  const truncatedLog = logSnippet.length > MAX_LOG_SNIPPET
    ? logSnippet.slice(-MAX_LOG_SNIPPET)
    : logSnippet;

  return `Fix the CI failure in PR #${prNumber}.

FAILURE TYPE: ${failureType}

SUMMARY: ${summary}

RECENT LOG OUTPUT:
\`\`\`
${truncatedLog}
\`\`\`

${STRICT_RULES}

TASK:
1. Analyze the failure above
2. Make minimal changes to fix the issue
3. Run tests locally to verify: npm run test:unit
4. The fix should be small and focused

Only fix what is broken. Do not refactor unrelated code.`;
}
