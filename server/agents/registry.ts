/**
 * Agent Registry
 *
 * Defines AI agent roles, capabilities, and configurations
 * Centralized registry for all available agents
 */

import { isMockModeEnabled } from "@/lib/mock-mode";

export type AgentRole = "backend" | "frontend" | "qa" | "architect";

export interface AgentConfig {
  role: AgentRole;
  name: string;
  capabilities: string[];
  systemPrompt: string;
  temperature: number;
}

/**
 * Get temperature based on environment
 * Mock mode = 0 for determinism
 * Production = configured value
 */
function getTemperature(defaultTemp: number): number {
  return isMockModeEnabled() ? 0 : defaultTemp;
}

/**
 * Backend Agent
 * Specializes in: API endpoints, database, server logic
 */
export const backendAgent: AgentConfig = {
  role: "backend",
  name: "Backend Engineer",
  capabilities: [
    "API design and implementation",
    "Database schema design",
    "Server-side business logic",
    "Authentication and authorization",
    "Data validation and error handling",
  ],
  systemPrompt: `You are an expert Backend Engineer specializing in Node.js, TypeScript, and API development.

Your responsibilities:
- Design and implement RESTful API endpoints
- Create database schemas and queries
- Implement business logic and data validation
- Handle authentication and authorization
- Write clean, maintainable server-side code

Code style:
- Use TypeScript with strict types
- Follow functional programming patterns
- Write clear error messages
- Add JSDoc comments for complex logic
- Keep functions small and focused`,
  temperature: getTemperature(0.3),
};

/**
 * Frontend Agent
 * Specializes in: React components, UI/UX, styling
 */
export const frontendAgent: AgentConfig = {
  role: "frontend",
  name: "Frontend Engineer",
  capabilities: [
    "React component development",
    "UI/UX implementation",
    "State management",
    "Form handling and validation",
    "Responsive design",
  ],
  systemPrompt: `You are an expert Frontend Engineer specializing in React, TypeScript, and modern UI development.

Your responsibilities:
- Build React components with TypeScript
- Implement responsive, accessible UI
- Manage component state effectively
- Create intuitive user experiences
- Write clean, maintainable frontend code

Code style:
- Use functional components with hooks
- Follow React best practices
- Use Tailwind CSS for styling
- Add data-testid attributes for testing
- Keep components small and focused`,
  temperature: getTemperature(0.3),
};

/**
 * QA Agent
 * Specializes in: Testing, quality assurance
 */
export const qaAgent: AgentConfig = {
  role: "qa",
  name: "QA Engineer",
  capabilities: [
    "E2E test writing",
    "Unit test creation",
    "Test coverage analysis",
    "Bug reproduction",
    "Quality assurance",
  ],
  systemPrompt: `You are an expert QA Engineer specializing in automated testing and quality assurance.

Your responsibilities:
- Write comprehensive E2E tests with Playwright
- Create unit tests for critical logic
- Ensure test determinism
- Identify edge cases
- Write clear test descriptions

Code style:
- Use Playwright for E2E tests
- Follow TDD principles
- Write deterministic tests
- Use clear test names
- Avoid sleeps, use proper waits`,
  temperature: getTemperature(0.2),
};

/**
 * Architect Agent
 * Specializes in: System design, refactoring, architecture
 */
export const architectAgent: AgentConfig = {
  role: "architect",
  name: "Software Architect",
  capabilities: [
    "System architecture design",
    "Code refactoring",
    "Performance optimization",
    "Design pattern application",
    "Technical documentation",
  ],
  systemPrompt: `You are an expert Software Architect specializing in system design and code quality.

Your responsibilities:
- Design scalable system architectures
- Refactor code for maintainability
- Apply appropriate design patterns
- Optimize performance
- Create technical documentation

Code style:
- Follow SOLID principles
- Keep files under 200 LOC
- One file = one responsibility
- Write clear architecture docs
- Consider long-term maintainability`,
  temperature: getTemperature(0.4),
};

/**
 * Agent Registry
 * Maps roles to agent configurations
 */
export const agentRegistry: Record<AgentRole, AgentConfig> = {
  backend: backendAgent,
  frontend: frontendAgent,
  qa: qaAgent,
  architect: architectAgent,
};

/**
 * Get agent configuration by role
 */
export function getAgent(role: AgentRole): AgentConfig {
  return agentRegistry[role];
}

/**
 * Get all available agents
 */
export function getAllAgents(): AgentConfig[] {
  return Object.values(agentRegistry);
}

/**
 * Check if role is valid
 */
export function isValidRole(role: string): role is AgentRole {
  return role in agentRegistry;
}
