/**
 * Council Backlog Generator - deterministic large plan generator
 * Generates 30-200 actionable steps based on idea text.
 * No randomness - uses stable hash for deterministic variety.
 */

export interface CouncilBacklogResult {
  mode: "PLAN" | "QUESTIONS";
  planSteps?: string[];
  questions?: string[];
}

function stableHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = (hash * 33) ^ str.charCodeAt(i);
  return hash >>> 0;
}

const ACTION_VERBS = [
  "Create", "Implement", "Add", "Configure", "Write", "Test", "Deploy",
  "Refactor", "Design", "Build", "Setup", "Define", "Integrate", "Update",
  "Review", "Validate", "Initialize", "Install", "Enable", "Document",
];

const BASE_STEPS = [
  "Initialize project repository", "Setup development environment",
  "Configure package manager", "Install core dependencies",
  "Setup linting and formatting", "Configure TypeScript",
  "Setup testing framework", "Create project structure",
  "Configure environment variables", "Setup CI/CD pipeline",
  "Design database schema", "Create database migrations",
  "Setup database connection", "Implement data models",
  "Add database indexes", "Configure connection pooling",
  "Create seed data scripts", "Implement data validation",
  "Implement user registration", "Create login endpoint",
  "Add password hashing", "Setup JWT authentication",
  "Implement session management", "Add logout functionality",
  "Create password reset flow", "Add email verification",
  "Design API architecture", "Create base API routes",
  "Implement error handling", "Add request validation",
  "Setup rate limiting", "Create API documentation",
  "Add response formatting", "Implement pagination",
  "Setup frontend framework", "Create component library",
  "Implement routing", "Add state management",
  "Create form components", "Implement loading states",
  "Add error boundaries", "Create layout components",
  "Write unit tests", "Create integration tests",
  "Setup E2E testing", "Add test coverage reporting",
  "Configure production build", "Setup deployment scripts",
  "Create Docker configuration", "Configure cloud hosting",
];

const EXTRA_OBJECTS = [
  "user interface components", "API endpoints", "database queries",
  "authentication flow", "error handling logic", "input validation",
  "unit test suite", "integration tests", "deployment configuration",
  "logging system", "caching layer", "search functionality",
  "notification system", "email templates", "admin dashboard",
  "user settings page", "analytics tracking", "performance metrics",
  "backup procedures", "security measures", "access control",
  "data export feature", "import functionality", "reporting module",
  "webhook handlers", "background jobs", "scheduled tasks",
  "core module structure", "helper utilities", "shared components",
  "type definitions", "service layer", "middleware functions",
];

const QUESTIONS = [
  "What is the primary goal of this application?",
  "Who are the target users?",
  "What platforms should be supported?",
  "Are there any specific technology preferences?",
  "What is the expected timeline?",
  "Are there any budget constraints?",
];

function shouldGeneratePlan(idea: string): boolean {
  const t = idea.trim(), l = t.toLowerCase();
  if (l.includes("mvp") || l.includes("быстро")) return true;
  const dk = ["platform", "system", "application", "with", "catalog", "auth"];
  if (dk.some((k) => l.includes(k)) && t.length >= 20 && t.split(/\s+/).length >= 3) return true;
  return t.length >= 50 && t.split(/\s+/).length >= 6;
}

function generateSteps(idea: string): string[] {
  const hash = stableHash(idea);
  const steps = [...BASE_STEPS];
  const used = new Set(steps);
  const target = 60 + (hash % 60);

  while (steps.length < target) {
    const vi = (hash + steps.length) % ACTION_VERBS.length;
    const oi = (hash + steps.length * 3) % EXTRA_OBJECTS.length;
    const step = `${ACTION_VERBS[vi]} ${EXTRA_OBJECTS[oi]}`;
    if (!used.has(step)) {
      steps.push(step);
      used.add(step);
    }
  }
  return steps;
}

export function generateCouncilBacklog(idea: string): CouncilBacklogResult {
  if (!shouldGeneratePlan(idea)) {
    const hash = stableHash(idea);
    return { mode: "QUESTIONS", questions: QUESTIONS.slice(0, 3 + (hash % 4)) };
  }
  return { mode: "PLAN", planSteps: generateSteps(idea) };
}
