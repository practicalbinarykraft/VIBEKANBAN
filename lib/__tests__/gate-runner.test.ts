/**
 * Gate Runner Tests
 * TDD: RED phase - tests for product gate / Definition of Done checks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  runGate,
  GateResult,
  CheckResult,
  formatJsonReport,
  formatMarkdownReport,
} from '../gate-runner';

describe('runGate', () => {
  it('should return GateResult with all check results', async () => {
    const result = await runGate({ dryRun: true });

    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('checks');
    expect(result).toHaveProperty('timestamp');
    expect(Array.isArray(result.checks)).toBe(true);
  });

  it('should include all required checks', async () => {
    const result = await runGate({ dryRun: true });
    const checkNames = result.checks.map((c) => c.name);

    expect(checkNames).toContain('typescript');
    expect(checkNames).toContain('lint');
    expect(checkNames).toContain('unit-tests');
    expect(checkNames).toContain('build');
    expect(checkNames).toContain('loc-limits');
  });

  it('should pass when all checks pass', async () => {
    const result = await runGate({ dryRun: true });

    // In dry run mode, all checks should pass
    expect(result.passed).toBe(true);
    for (const check of result.checks) {
      expect(check.passed).toBe(true);
    }
  });

  it('should fail if any check fails', async () => {
    // Simulate a failing check by mocking
    const result = await runGate({
      dryRun: true,
      mockFailures: ['lint'],
    });

    expect(result.passed).toBe(false);
    const lintCheck = result.checks.find((c) => c.name === 'lint');
    expect(lintCheck?.passed).toBe(false);
  });

  it('should include duration for each check', async () => {
    const result = await runGate({ dryRun: true });

    for (const check of result.checks) {
      expect(typeof check.durationMs).toBe('number');
      expect(check.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('should include error message for failed checks', async () => {
    const result = await runGate({
      dryRun: true,
      mockFailures: ['typescript'],
    });

    const tsCheck = result.checks.find((c) => c.name === 'typescript');
    expect(tsCheck?.passed).toBe(false);
    expect(tsCheck?.error).toBeTruthy();
  });
});

describe('CheckResult', () => {
  it('should have required properties', () => {
    const check: CheckResult = {
      name: 'typescript',
      passed: true,
      durationMs: 1234,
    };

    expect(check.name).toBe('typescript');
    expect(check.passed).toBe(true);
    expect(check.durationMs).toBe(1234);
  });

  it('should allow optional error and output', () => {
    const check: CheckResult = {
      name: 'lint',
      passed: false,
      durationMs: 500,
      error: 'ESLint found 3 errors',
      output: 'src/file.ts:10:5 error...',
    };

    expect(check.error).toBe('ESLint found 3 errors');
    expect(check.output).toBeTruthy();
  });
});

describe('formatJsonReport', () => {
  it('should produce valid JSON string', () => {
    const gateResult: GateResult = {
      passed: true,
      checks: [
        { name: 'typescript', passed: true, durationMs: 1000 },
        { name: 'lint', passed: true, durationMs: 500 },
      ],
      timestamp: '2024-01-15T10:00:00Z',
      totalDurationMs: 1500,
    };

    const json = formatJsonReport(gateResult);
    const parsed = JSON.parse(json);

    expect(parsed.passed).toBe(true);
    expect(parsed.checks).toHaveLength(2);
    expect(parsed.timestamp).toBe('2024-01-15T10:00:00Z');
  });

  it('should be deterministic (same input = same output)', () => {
    const gateResult: GateResult = {
      passed: true,
      checks: [{ name: 'build', passed: true, durationMs: 2000 }],
      timestamp: '2024-01-15T10:00:00Z',
      totalDurationMs: 2000,
    };

    const json1 = formatJsonReport(gateResult);
    const json2 = formatJsonReport(gateResult);

    expect(json1).toBe(json2);
  });
});

describe('formatMarkdownReport', () => {
  it('should produce markdown with header', () => {
    const gateResult: GateResult = {
      passed: true,
      checks: [{ name: 'typescript', passed: true, durationMs: 1000 }],
      timestamp: '2024-01-15T10:00:00Z',
      totalDurationMs: 1000,
    };

    const md = formatMarkdownReport(gateResult);

    expect(md).toContain('# Definition of Done Report');
    expect(md).toContain('PASSED');
  });

  it('should show FAILED status when gate fails', () => {
    const gateResult: GateResult = {
      passed: false,
      checks: [
        { name: 'typescript', passed: true, durationMs: 1000 },
        { name: 'lint', passed: false, durationMs: 500, error: 'Lint errors' },
      ],
      timestamp: '2024-01-15T10:00:00Z',
      totalDurationMs: 1500,
    };

    const md = formatMarkdownReport(gateResult);

    expect(md).toContain('FAILED');
    expect(md).toContain('lint');
    expect(md).toContain('Lint errors');
  });

  it('should include checkmark/cross for each check', () => {
    const gateResult: GateResult = {
      passed: false,
      checks: [
        { name: 'typescript', passed: true, durationMs: 1000 },
        { name: 'lint', passed: false, durationMs: 500, error: 'Failed' },
      ],
      timestamp: '2024-01-15T10:00:00Z',
      totalDurationMs: 1500,
    };

    const md = formatMarkdownReport(gateResult);

    // Should have pass indicator for typescript
    expect(md).toMatch(/[✓✅].*typescript/i);
    // Should have fail indicator for lint
    expect(md).toMatch(/[✗❌].*lint/i);
  });

  it('should include summary statistics', () => {
    const gateResult: GateResult = {
      passed: true,
      checks: [
        { name: 'typescript', passed: true, durationMs: 1000 },
        { name: 'lint', passed: true, durationMs: 500 },
        { name: 'build', passed: true, durationMs: 3000 },
      ],
      timestamp: '2024-01-15T10:00:00Z',
      totalDurationMs: 4500,
    };

    const md = formatMarkdownReport(gateResult);

    expect(md).toContain('3/3');
    expect(md).toMatch(/4\.5s|4500ms/i);
  });
});
