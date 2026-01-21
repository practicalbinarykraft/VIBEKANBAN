/** Factory Auto-Fix Prompt Builder Tests (PR-100) - TDD */
import { describe, it, expect } from "vitest";
import { buildClaudeFixPrompt, type PromptContext } from "../factory-auto-fix-prompt";

const baseContext: PromptContext = {
  failureType: "Unit_test_failure",
  summary: "Test failed in user.service.test.ts",
  logSnippet: "FAIL  server/services/__tests__/user.service.test.ts\n  × should validate email",
  prNumber: 42,
};

describe("factory-auto-fix-prompt", () => {
  it("includes failure type in prompt", () => {
    const prompt = buildClaudeFixPrompt(baseContext);
    expect(prompt).toContain("Unit_test_failure");
  });

  it("includes summary in prompt", () => {
    const prompt = buildClaudeFixPrompt(baseContext);
    expect(prompt).toContain("Test failed in user.service.test.ts");
  });

  it("includes log snippet in prompt", () => {
    const prompt = buildClaudeFixPrompt(baseContext);
    expect(prompt).toContain("should validate email");
  });

  it("truncates long log snippets to max 1000 chars", () => {
    const longLog = "x".repeat(2000);
    const context = { ...baseContext, logSnippet: longLog };
    const prompt = buildClaudeFixPrompt(context);
    // Should not contain full 2000 chars
    expect(prompt.length).toBeLessThan(baseContext.summary.length + 2000 + 500);
  });

  it("includes E2E restriction rule", () => {
    const prompt = buildClaudeFixPrompt(baseContext);
    expect(prompt.toLowerCase()).toContain("do not touch e2e");
  });

  it("includes no new E2E rule", () => {
    const prompt = buildClaudeFixPrompt(baseContext);
    expect(prompt.toLowerCase()).toContain("do not add");
    expect(prompt.toLowerCase()).toContain("e2e");
  });

  it("includes 200 LOC limit rule", () => {
    const prompt = buildClaudeFixPrompt(baseContext);
    expect(prompt).toContain("200");
    expect(prompt.toLowerCase()).toContain("loc");
  });

  it("includes scope restriction (allowed directories)", () => {
    const prompt = buildClaudeFixPrompt(baseContext);
    expect(prompt).toContain("server/");
    expect(prompt).toContain("components/");
  });

  it("includes PR number for commit context", () => {
    const prompt = buildClaudeFixPrompt(baseContext);
    expect(prompt).toContain("42");
  });

  it("handles TS_error failure type", () => {
    const context = { ...baseContext, failureType: "TS_error" as const };
    const prompt = buildClaudeFixPrompt(context);
    expect(prompt).toContain("TS_error");
  });

  it("handles Build_failed failure type", () => {
    const context = { ...baseContext, failureType: "Build_failed" as const };
    const prompt = buildClaudeFixPrompt(context);
    expect(prompt).toContain("Build_failed");
  });
});
