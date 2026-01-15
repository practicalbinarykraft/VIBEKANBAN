/**
 * Unit tests for council-backlog-generator
 *
 * TDD first: tests before implementation
 */

import { describe, it, expect } from "vitest";
import { generateCouncilBacklog } from "../council-backlog-generator";

describe("generateCouncilBacklog", () => {
  describe("determinism", () => {
    it("same idea returns same output (deepEqual)", () => {
      const idea = "Build MVP for e-commerce platform with user auth";
      const result1 = generateCouncilBacklog(idea);
      const result2 = generateCouncilBacklog(idea);
      expect(result1).toEqual(result2);
    });

    it("different ideas return different outputs", () => {
      const result1 = generateCouncilBacklog("Build MVP for e-commerce");
      const result2 = generateCouncilBacklog("Create mobile app for fitness");
      expect(result1.planSteps).not.toEqual(result2.planSteps);
    });
  });

  describe("PLAN mode", () => {
    it("returns PLAN for detailed idea", () => {
      const result = generateCouncilBacklog(
        "Build a complete e-commerce platform with product catalog"
      );
      expect(result.mode).toBe("PLAN");
      expect(result.planSteps).toBeDefined();
      expect(result.questions).toBeUndefined();
    });

    it("planSteps count in range [30, 200]", () => {
      const result = generateCouncilBacklog(
        "Build MVP for task management application with teams"
      );
      expect(result.planSteps!.length).toBeGreaterThanOrEqual(30);
      expect(result.planSteps!.length).toBeLessThanOrEqual(200);
    });

    it("all steps are non-empty and trimmed", () => {
      const result = generateCouncilBacklog(
        "Create project management tool with kanban boards"
      );
      for (const step of result.planSteps!) {
        expect(step.trim()).not.toBe("");
        expect(step).toBe(step.trim());
      }
    });

    it("no duplicate steps", () => {
      const result = generateCouncilBacklog(
        "Build social media platform with messaging"
      );
      const uniqueSteps = new Set(result.planSteps);
      expect(uniqueSteps.size).toBe(result.planSteps!.length);
    });

    it("steps look actionable (start with capital, contain space)", () => {
      const result = generateCouncilBacklog(
        "Create inventory management system"
      );
      for (const step of result.planSteps!) {
        // Step should start with capital letter
        expect(step[0]).toBe(step[0].toUpperCase());
        // Step should contain at least one space (verb + noun pattern)
        expect(step).toContain(" ");
      }
    });

    it("steps start with action verbs", () => {
      const actionVerbs = [
        "Create", "Implement", "Add", "Configure", "Write", "Test",
        "Deploy", "Refactor", "Design", "Build", "Setup", "Define",
        "Integrate", "Update", "Remove", "Fix", "Optimize", "Document",
        "Review", "Validate", "Initialize", "Install", "Migrate", "Enable",
      ];
      const result = generateCouncilBacklog(
        "Build complete CRM system with analytics"
      );

      let actionableCount = 0;
      for (const step of result.planSteps!) {
        const firstWord = step.split(" ")[0];
        if (actionVerbs.includes(firstWord)) {
          actionableCount++;
        }
      }
      // At least 80% of steps should start with action verbs
      expect(actionableCount / result.planSteps!.length).toBeGreaterThan(0.8);
    });
  });

  describe("QUESTIONS mode", () => {
    it("returns QUESTIONS for short/unclear idea", () => {
      const result = generateCouncilBacklog("app");
      expect(result.mode).toBe("QUESTIONS");
      expect(result.questions).toBeDefined();
      expect(result.planSteps).toBeUndefined();
    });

    it("returns QUESTIONS for empty idea", () => {
      const result = generateCouncilBacklog("");
      expect(result.mode).toBe("QUESTIONS");
    });

    it("questions count in range [2, 6]", () => {
      const result = generateCouncilBacklog("something");
      expect(result.questions!.length).toBeGreaterThanOrEqual(2);
      expect(result.questions!.length).toBeLessThanOrEqual(6);
    });

    it("questions are deterministic", () => {
      const idea = "build app";
      const result1 = generateCouncilBacklog(idea);
      const result2 = generateCouncilBacklog(idea);
      expect(result1.questions).toEqual(result2.questions);
    });
  });
});
