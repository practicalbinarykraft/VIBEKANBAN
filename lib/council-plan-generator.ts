/**
 * Council Plan Generator - pure deterministic module
 *
 * Generates structured plan or questions based on idea text.
 * No randomness, no Date.now(), no external calls.
 */

export type CouncilResultMode = "PLAN" | "QUESTIONS";

export interface CouncilResult {
  mode: CouncilResultMode;
  planSteps?: string[];
  questions?: string[];
}

/**
 * Base plan steps - always included for PLAN mode
 */
const BASE_PLAN_STEPS: string[] = [
  "Initialize project repository",
  "Setup development environment",
  "Create basic project structure",
  "Define data models and schemas",
  "Implement core business logic",
  "Create API endpoints",
  "Build user interface components",
  "Add authentication and authorization",
  "Write unit tests",
  "Setup CI/CD pipeline",
  "Perform integration testing",
  "Deploy to staging environment",
  "Conduct user acceptance testing",
  "Fix bugs and polish UI",
  "Deploy to production",
];

/**
 * Base questions - always used for QUESTIONS mode
 */
const BASE_QUESTIONS: string[] = [
  "Who is the target audience for this application?",
  "What are the main features for the first version?",
  "Are there any budget constraints for the project?",
  "Which platforms do you want to support (web, mobile)?",
  "Do you have existing design mockups or wireframes?",
  "What is the expected timeline for the MVP?",
];

/**
 * Determines if idea triggers PLAN mode
 */
function shouldGeneratePlan(idea: string): boolean {
  const lowerIdea = idea.toLowerCase();
  return lowerIdea.includes("mvp") || lowerIdea.includes("быстро");
}

/**
 * Generates deterministic plan steps based on idea
 * Steps are always the same for the same input
 */
function generatePlanSteps(idea: string): string[] {
  const steps = [...BASE_PLAN_STEPS];

  // Add idea-specific steps based on keywords (deterministic)
  const lowerIdea = idea.toLowerCase();

  if (lowerIdea.includes("e-commerce") || lowerIdea.includes("shop")) {
    steps.push("Implement product catalog");
    steps.push("Add shopping cart functionality");
    steps.push("Integrate payment gateway");
  }

  if (lowerIdea.includes("mobile") || lowerIdea.includes("app")) {
    steps.push("Configure mobile responsiveness");
  }

  if (lowerIdea.includes("api") || lowerIdea.includes("backend")) {
    steps.push("Document API endpoints");
    steps.push("Add rate limiting");
  }

  // Ensure constraints: min 3, max 30, all trimmed
  const finalSteps = steps
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 30);

  return finalSteps;
}

/**
 * Generates deterministic questions based on idea
 */
function generateQuestions(idea: string): string[] {
  const questions = [...BASE_QUESTIONS];

  const lowerIdea = idea.toLowerCase();

  if (lowerIdea.includes("api") || lowerIdea.includes("backend")) {
    questions.push("What authentication method do you prefer (JWT, OAuth)?");
  }

  if (lowerIdea.includes("database") || lowerIdea.includes("data")) {
    questions.push("What database technology do you want to use?");
  }

  // Ensure constraints: min 3, max 10
  return questions.slice(0, 10);
}

/**
 * Main generator function - pure and deterministic
 *
 * @param idea - The project idea text
 * @returns CouncilResult with mode and either planSteps or questions
 */
export function generateCouncilResult(idea: string): CouncilResult {
  if (shouldGeneratePlan(idea)) {
    return {
      mode: "PLAN",
      planSteps: generatePlanSteps(idea),
    };
  }

  return {
    mode: "QUESTIONS",
    questions: generateQuestions(idea),
  };
}
