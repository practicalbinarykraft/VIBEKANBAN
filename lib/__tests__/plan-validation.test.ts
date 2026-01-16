import { describe, it, expect } from "vitest";
import { validatePlan, ValidationResult } from "../plan-validation";

describe("plan-validation", () => {
  describe("validatePlan", () => {
    describe("min_tasks rule", () => {
      it("fails when plan has fewer than 10 steps", () => {
        const steps = ["Create UI", "Add API", "Write tests"];
        const result = validatePlan(steps);
        expect(result.ok).toBe(false);
        expect(result.reasons.some((r) => r.code === "min_tasks")).toBe(true);
      });

      it("passes when plan has exactly 10 steps", () => {
        const steps = Array(10)
          .fill(0)
          .map((_, i) => `Create feature ${i + 1}`);
        const result = validatePlan(steps);
        expect(result.reasons.some((r) => r.code === "min_tasks")).toBe(false);
      });

      it("passes when plan has more than 10 steps", () => {
        const steps = Array(15)
          .fill(0)
          .map((_, i) => `Create feature ${i + 1}`);
        const result = validatePlan(steps);
        expect(result.reasons.some((r) => r.code === "min_tasks")).toBe(false);
      });
    });

    describe("no_placeholders rule", () => {
      it("fails when step contains TBD", () => {
        const steps = Array(10)
          .fill(0)
          .map((_, i) => (i === 5 ? "Create TBD feature" : `Create feature ${i}`));
        const result = validatePlan(steps);
        expect(result.ok).toBe(false);
        expect(result.reasons.some((r) => r.code === "no_placeholders")).toBe(true);
      });

      it("fails when step contains TODO", () => {
        const steps = Array(10)
          .fill(0)
          .map((_, i) => (i === 3 ? "TODO: implement this" : `Create feature ${i}`));
        const result = validatePlan(steps);
        expect(result.ok).toBe(false);
        expect(result.reasons.some((r) => r.code === "no_placeholders")).toBe(true);
      });

      it("fails when step contains ... (ellipsis)", () => {
        const steps = Array(10)
          .fill(0)
          .map((_, i) => (i === 2 ? "Create something..." : `Create feature ${i}`));
        const result = validatePlan(steps);
        expect(result.ok).toBe(false);
        expect(result.reasons.some((r) => r.code === "no_placeholders")).toBe(true);
      });

      it("fails when step contains placeholder (case-insensitive)", () => {
        const steps = Array(10)
          .fill(0)
          .map((_, i) => (i === 0 ? "Add PLACEHOLDER here" : `Create feature ${i}`));
        const result = validatePlan(steps);
        expect(result.ok).toBe(false);
        expect(result.reasons.some((r) => r.code === "no_placeholders")).toBe(true);
      });

      it("fails when step contains lorem", () => {
        const steps = Array(10)
          .fill(0)
          .map((_, i) => (i === 1 ? "Lorem ipsum task" : `Create feature ${i}`));
        const result = validatePlan(steps);
        expect(result.ok).toBe(false);
        expect(result.reasons.some((r) => r.code === "no_placeholders")).toBe(true);
      });

      it("passes when no placeholders present", () => {
        const steps = Array(10)
          .fill(0)
          .map((_, i) => `Create feature ${i + 1}`);
        const result = validatePlan(steps);
        expect(result.reasons.some((r) => r.code === "no_placeholders")).toBe(false);
      });
    });

    describe("verbish rule", () => {
      it("passes when step starts with known verb", () => {
        const verbs = [
          "Create", "Implement", "Add", "Configure", "Write",
          "Build", "Refactor", "Test", "Deploy", "Fix", "Update", "Set",
        ];
        const steps = verbs.map((v) => `${v} something important`);
        // Pad to 10 if needed
        while (steps.length < 10) steps.push("Add another feature");
        const result = validatePlan(steps);
        expect(result.reasons.some((r) => r.code === "verbish")).toBe(false);
      });

      it("passes when step starts with capitalized word", () => {
        const steps = Array(10)
          .fill(0)
          .map((_, i) => `Execute task ${i + 1}`);
        const result = validatePlan(steps);
        expect(result.reasons.some((r) => r.code === "verbish")).toBe(false);
      });

      it("fails when step starts with lowercase", () => {
        const steps = Array(10)
          .fill(0)
          .map((_, i) => (i === 4 ? "create something" : `Create feature ${i}`));
        const result = validatePlan(steps);
        expect(result.ok).toBe(false);
        expect(result.reasons.some((r) => r.code === "verbish")).toBe(true);
      });

      it("fails when step starts with number", () => {
        const steps = Array(10)
          .fill(0)
          .map((_, i) => (i === 0 ? "123 do something" : `Create feature ${i}`));
        const result = validatePlan(steps);
        expect(result.ok).toBe(false);
        expect(result.reasons.some((r) => r.code === "verbish")).toBe(true);
      });
    });

    describe("unique rule", () => {
      it("fails when duplicate steps exist", () => {
        const steps = [
          "Create login page",
          "Create signup page",
          "Create login page", // duplicate
          "Add authentication",
          "Build API endpoints",
          "Write unit tests",
          "Configure database",
          "Implement validation",
          "Deploy to staging",
          "Test integration",
        ];
        const result = validatePlan(steps);
        expect(result.ok).toBe(false);
        expect(result.reasons.some((r) => r.code === "unique")).toBe(true);
      });

      it("fails when duplicate steps exist (case-insensitive)", () => {
        const steps = [
          "Create login page",
          "CREATE LOGIN PAGE", // duplicate (case-insensitive)
          "Add signup feature",
          "Build API layer",
          "Write tests now",
          "Configure settings",
          "Implement cache",
          "Deploy service",
          "Test everything",
          "Fix any bugs",
        ];
        const result = validatePlan(steps);
        expect(result.ok).toBe(false);
        expect(result.reasons.some((r) => r.code === "unique")).toBe(true);
      });

      it("fails when duplicate steps exist (trimmed)", () => {
        const steps = [
          "Create login page",
          "  Create login page  ", // duplicate (with whitespace)
          "Add signup feature",
          "Build API layer",
          "Write tests now",
          "Configure settings",
          "Implement cache",
          "Deploy service",
          "Test everything",
          "Fix any bugs",
        ];
        const result = validatePlan(steps);
        expect(result.ok).toBe(false);
        expect(result.reasons.some((r) => r.code === "unique")).toBe(true);
      });

      it("passes when all steps are unique", () => {
        const steps = Array(10)
          .fill(0)
          .map((_, i) => `Create unique feature ${i + 1}`);
        const result = validatePlan(steps);
        expect(result.reasons.some((r) => r.code === "unique")).toBe(false);
      });
    });

    describe("combined validation", () => {
      it("returns ok=true when all rules pass", () => {
        const steps = [
          "Create user authentication module",
          "Implement login form component",
          "Add registration workflow",
          "Configure JWT token handling",
          "Write unit tests for auth",
          "Build API endpoint layer",
          "Refactor database schema",
          "Test integration flows",
          "Deploy to staging environment",
          "Fix security vulnerabilities",
        ];
        const result = validatePlan(steps);
        expect(result.ok).toBe(true);
        expect(result.reasons).toHaveLength(0);
      });

      it("returns multiple reasons when multiple rules fail", () => {
        const steps = ["tbd task", "TBD task"]; // 3 rules fail: min_tasks, verbish, unique
        const result = validatePlan(steps);
        expect(result.ok).toBe(false);
        expect(result.reasons.length).toBeGreaterThanOrEqual(2);
      });

      it("is deterministic - same input gives same output", () => {
        const steps = Array(10)
          .fill(0)
          .map((_, i) => `Create feature ${i + 1}`);
        const result1 = validatePlan(steps);
        const result2 = validatePlan(steps);
        expect(result1).toEqual(result2);
      });
    });
  });
});
