/**
 * Gate Runner - Definition of Done quality checks
 *
 * Runs all required checks and produces reports in JSON and Markdown formats.
 */

import { execSync } from 'child_process';

export interface CheckResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  output?: string;
}

export interface GateResult {
  passed: boolean;
  checks: CheckResult[];
  timestamp: string;
  totalDurationMs: number;
}

export interface GateOptions {
  dryRun?: boolean;
  mockFailures?: string[];
}

type CheckFn = () => { passed: boolean; error?: string; output?: string };

const CHECKS: { name: string; fn: CheckFn }[] = [
  {
    name: 'typescript',
    fn: () => runCommand('npx tsc --noEmit', 'TypeScript compilation failed'),
  },
  {
    name: 'unit-tests',
    fn: () => runCommand('npm run test:unit', 'Unit tests failed'),
  },
  {
    name: 'build',
    fn: () => runCommand('npm run build', 'Build failed'),
  },
  {
    name: 'loc-limits',
    fn: () => runCommand('npm run check:loc', 'LOC limits exceeded'),
  },
];

function runCommand(
  cmd: string,
  errorMsg: string
): { passed: boolean; error?: string; output?: string } {
  try {
    const output = execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 300000, // 5 min timeout
    });
    return { passed: true, output };
  } catch (err: any) {
    const output = err.stdout || err.stderr || err.message;
    return { passed: false, error: errorMsg, output };
  }
}

/**
 * Run all gate checks
 */
export async function runGate(options: GateOptions = {}): Promise<GateResult> {
  const { dryRun = false, mockFailures = [] } = options;
  const startTime = Date.now();
  const checks: CheckResult[] = [];

  for (const check of CHECKS) {
    const checkStart = Date.now();
    let result: { passed: boolean; error?: string; output?: string };

    if (dryRun) {
      // In dry run mode, simulate checks
      const shouldFail = mockFailures.includes(check.name);
      result = {
        passed: !shouldFail,
        error: shouldFail ? `Mock failure for ${check.name}` : undefined,
      };
    } else {
      result = check.fn();
    }

    checks.push({
      name: check.name,
      passed: result.passed,
      durationMs: Date.now() - checkStart,
      error: result.error,
      output: result.output,
    });
  }

  const passed = checks.every((c) => c.passed);
  const totalDurationMs = Date.now() - startTime;

  return {
    passed,
    checks,
    timestamp: new Date().toISOString(),
    totalDurationMs,
  };
}

/**
 * Format gate result as JSON string
 */
export function formatJsonReport(result: GateResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format gate result as Markdown
 */
export function formatMarkdownReport(result: GateResult): string {
  const status = result.passed ? '✅ PASSED' : '❌ FAILED';
  const passedCount = result.checks.filter((c) => c.passed).length;
  const totalCount = result.checks.length;
  const durationSec = (result.totalDurationMs / 1000).toFixed(1);

  let md = `# Definition of Done Report\n\n`;
  md += `**Status:** ${status}\n\n`;
  md += `**Summary:** ${passedCount}/${totalCount} checks passed in ${durationSec}s\n\n`;
  md += `**Timestamp:** ${result.timestamp}\n\n`;
  md += `## Checks\n\n`;

  for (const check of result.checks) {
    const icon = check.passed ? '✓' : '✗';
    const durationMs = check.durationMs;
    md += `- ${icon} **${check.name}** (${durationMs}ms)`;
    if (check.error) {
      md += ` - ${check.error}`;
    }
    md += '\n';
  }

  if (!result.passed) {
    md += '\n## Failed Checks Details\n\n';
    for (const check of result.checks.filter((c) => !c.passed)) {
      md += `### ${check.name}\n\n`;
      md += `**Error:** ${check.error || 'Unknown error'}\n\n`;
      if (check.output) {
        md += `\`\`\`\n${check.output.slice(0, 2000)}\n\`\`\`\n\n`;
      }
    }
  }

  return md;
}
