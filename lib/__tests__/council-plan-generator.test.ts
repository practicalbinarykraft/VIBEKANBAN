/**
 * Unit tests for council-plan-generator
 *
 * TDD first: write tests before implementation
 */

import { describe, it, expect } from "vitest";
import { generateCouncilResult } from "../council-plan-generator";

describe("generateCouncilResult", () => {
  describe("PLAN mode", () => {
    it("returns PLAN for idea containing MVP", () => {
      const result = generateCouncilResult("Build MVP for my app");
      expect(result.mode).toBe("PLAN");
      expect(result.planSteps).toBeDefined();
      expect(result.questions).toBeUndefined();
    });

    it("returns PLAN for idea containing быстро", () => {
      const result = generateCouncilResult("Сделать приложение быстро");
      expect(result.mode).toBe("PLAN");
      expect(result.planSteps).toBeDefined();
    });

    it("planSteps length >= 3", () => {
      const result = generateCouncilResult("Build MVP quickly");
      expect(result.planSteps!.length).toBeGreaterThanOrEqual(3);
    });

    it("planSteps length <= 30", () => {
      const result = generateCouncilResult("Build MVP with many features");
      expect(result.planSteps!.length).toBeLessThanOrEqual(30);
    });

    it("no empty or whitespace-only steps", () => {
      const result = generateCouncilResult("Create MVP for testing");
      for (const step of result.planSteps!) {
        expect(step.trim()).not.toBe("");
        expect(step).toBe(step.trim());
      }
    });

    it("deterministic output: same input twice returns same steps", () => {
      const idea = "Build MVP for e-commerce";
      const result1 = generateCouncilResult(idea);
      const result2 = generateCouncilResult(idea);
      expect(result1.planSteps).toEqual(result2.planSteps);
    });

    it("ordering stable: specific expected array for known input", () => {
      const result = generateCouncilResult("Build MVP quickly");
      // First 3 steps should always be the same
      expect(result.planSteps![0]).toBe("Initialize project repository");
      expect(result.planSteps![1]).toBe("Setup development environment");
      expect(result.planSteps![2]).toBe("Create basic project structure");
    });
  });

  describe("QUESTIONS mode", () => {
    it("returns QUESTIONS for neutral idea", () => {
      const result = generateCouncilResult("I want to build an app");
      expect(result.mode).toBe("QUESTIONS");
      expect(result.questions).toBeDefined();
      expect(result.planSteps).toBeUndefined();
    });

    it("questions length between 3 and 10, deterministic", () => {
      const idea = "Create a new application";
      const result1 = generateCouncilResult(idea);
      const result2 = generateCouncilResult(idea);

      expect(result1.questions!.length).toBeGreaterThanOrEqual(3);
      expect(result1.questions!.length).toBeLessThanOrEqual(10);
      expect(result1.questions).toEqual(result2.questions);
    });
  });
});
