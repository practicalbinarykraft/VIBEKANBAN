/**
 * AI Backlog Generator
 *
 * Generates 30-200 actionable steps using AI.
 * Falls back to deterministic generator in test/demo mode.
 */

import { getAICompletion, isAIConfigured } from "@/server/services/ai/ai-provider";
import { generateCouncilBacklog } from "./council-backlog-generator";
import { isMockModeEnabled } from "./mock-mode";

export interface BacklogStep {
  title: string;
  tasks: string[];
}

export interface BacklogResult {
  mode: "PLAN";
  steps: BacklogStep[];
  planSteps: string[];
}

// isTestMode removed - use isMockModeEnabled() from ./mock-mode

const SYSTEM_PROMPT = `You are a technical project planner. Generate a detailed implementation backlog for a software project.

Rules:
1. Generate between 30 and 100 specific, actionable tasks
2. Each task must start with a capitalized action verb (Create, Implement, Add, Configure, Write, Build, Test, Deploy, etc.)
3. Tasks should be granular and specific, not vague
4. Cover all aspects: setup, database, backend, frontend, testing, deployment
5. Order tasks logically (setup before implementation, implementation before testing)
6. NO placeholders like "TBD", "TODO", "...", or "placeholder"
7. Each task title should be unique

Return ONLY a JSON array of task titles, like:
["Create project repository", "Setup development environment", "Configure TypeScript", ...]`;

async function generateAIBacklog(ideaText: string, userAnswers?: Record<string, string>): Promise<string[]> {
  const context = userAnswers
    ? `Project Idea: ${ideaText}\n\nUser Clarifications:\n${Object.entries(userAnswers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n")}`
    : `Project Idea: ${ideaText}`;

  const result = await getAICompletion({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Generate implementation backlog for:\n\n${context}` }],
    maxTokens: 4000,
    temperature: 0.5,
  });

  // Parse JSON array from response
  const jsonMatch = result.content.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const tasks = JSON.parse(jsonMatch[0]) as string[];
      if (Array.isArray(tasks) && tasks.length >= 10) {
        // Filter valid tasks and ensure uniqueness
        const seen = new Set<string>();
        const validTasks = tasks.filter((t) => {
          if (typeof t !== "string" || !t.trim()) return false;
          const normalized = t.trim().toLowerCase();
          if (seen.has(normalized)) return false;
          seen.add(normalized);
          return /^[A-Z]/.test(t.trim()); // Must start with capital
        });
        if (validTasks.length >= 10) {
          return validTasks;
        }
      }
    } catch {
      // JSON parse error - fall through
    }
  }

  // If AI response was invalid, use deterministic fallback
  const fallback = generateCouncilBacklog(ideaText);
  return fallback.planSteps || [];
}

export async function generateBacklog(
  ideaText: string,
  userAnswers?: Record<string, string>
): Promise<BacklogResult> {
  let planSteps: string[];

  // Use AI if configured and not in test mode
  const aiConfigured = await isAIConfigured();
  if (aiConfigured && !isMockModeEnabled()) {
    try {
      planSteps = await generateAIBacklog(ideaText, userAnswers);
    } catch (error) {
      console.error("AI backlog generation failed, using fallback:", error);
      const fallback = generateCouncilBacklog(ideaText);
      planSteps = fallback.planSteps || [];
    }
  } else {
    // Test/demo mode - use deterministic generator
    const fallback = generateCouncilBacklog(ideaText);
    planSteps = fallback.planSteps || [];
  }

  // Transform to UI format
  const steps: BacklogStep[] = planSteps.map((title) => ({
    title,
    tasks: [],
  }));

  return {
    mode: "PLAN",
    steps,
    planSteps,
  };
}
