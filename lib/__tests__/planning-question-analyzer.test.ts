import { describe, it, expect } from "vitest";
import {
  analyzeIdeaForQuestions,
  AnalysisResult,
} from "../planning-question-analyzer";

describe("planning-question-analyzer", () => {
  describe("analyzeIdeaForQuestions", () => {
    describe("short prompts require questions", () => {
      it("returns needsQuestions=true for very short prompt (< 6 words)", () => {
        const result = analyzeIdeaForQuestions("build app");
        expect(result.needsQuestions).toBe(true);
        expect(result.reason).toContain("too short");
      });

      it("returns needsQuestions=true for single word", () => {
        const result = analyzeIdeaForQuestions("tetris");
        expect(result.needsQuestions).toBe(true);
      });

      it("returns needsQuestions=true for 5 words", () => {
        const result = analyzeIdeaForQuestions("make a todo list app");
        expect(result.needsQuestions).toBe(true);
      });
    });

    describe("medium prompts without details require questions", () => {
      it("returns needsQuestions=true for 10 words without key details", () => {
        const result = analyzeIdeaForQuestions(
          "I want to build something cool for my friends"
        );
        expect(result.needsQuestions).toBe(true);
        expect(result.reason).toContain("missing key details");
      });

      it("returns needsQuestions=true for 15 words without platform/stack/goal", () => {
        const result = analyzeIdeaForQuestions(
          "Create an application that helps people manage their daily tasks better every day"
        );
        expect(result.needsQuestions).toBe(true);
      });
    });

    describe("prompts with key details skip questions", () => {
      it("returns needsQuestions=false when platform is specified", () => {
        const result = analyzeIdeaForQuestions(
          "Build a mobile app for iOS and Android"
        );
        expect(result.needsQuestions).toBe(false);
      });

      it("returns needsQuestions=false when stack is specified", () => {
        const result = analyzeIdeaForQuestions(
          "Create a React application with Node.js backend"
        );
        expect(result.needsQuestions).toBe(false);
      });

      it("returns needsQuestions=false when user/goal is clear", () => {
        const result = analyzeIdeaForQuestions(
          "Build a dashboard for admin users to manage inventory"
        );
        expect(result.needsQuestions).toBe(false);
      });

      it("returns needsQuestions=false for MVP keyword", () => {
        const result = analyzeIdeaForQuestions("MVP for task management");
        expect(result.needsQuestions).toBe(false);
      });
    });

    describe("detailed prompts skip questions", () => {
      it("returns needsQuestions=false for long detailed prompt", () => {
        const result = analyzeIdeaForQuestions(
          "Build a web application using React and TypeScript for managing project tasks. " +
          "Users should be able to create projects, add tasks, and track progress. " +
          "Include authentication with JWT tokens."
        );
        expect(result.needsQuestions).toBe(false);
      });

      it("returns needsQuestions=false for 20+ words with technical terms", () => {
        const result = analyzeIdeaForQuestions(
          "Create an e-commerce platform with product catalog, shopping cart, " +
          "checkout flow, and payment integration using Stripe API"
        );
        expect(result.needsQuestions).toBe(false);
      });
    });

    describe("questions generation", () => {
      it("generates 3-6 questions when needed", () => {
        const result = analyzeIdeaForQuestions("tetris");
        expect(result.needsQuestions).toBe(true);
        expect(result.questions).toBeDefined();
        expect(result.questions!.length).toBeGreaterThanOrEqual(3);
        expect(result.questions!.length).toBeLessThanOrEqual(6);
      });

      it("questions are deterministic for same input", () => {
        const result1 = analyzeIdeaForQuestions("build game");
        const result2 = analyzeIdeaForQuestions("build game");
        expect(result1.questions).toEqual(result2.questions);
      });

      it("returns no questions when not needed", () => {
        const result = analyzeIdeaForQuestions(
          "Build a React dashboard with TypeScript for admin users"
        );
        expect(result.needsQuestions).toBe(false);
        expect(result.questions).toBeUndefined();
      });
    });
  });
});
