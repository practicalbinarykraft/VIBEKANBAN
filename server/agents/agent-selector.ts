/**
 * Agent Selector
 *
 * Selects appropriate agent based on task characteristics
 * Simple rule-based selection for MVP
 */

import { AgentRole } from "./registry";

export interface TaskInfo {
  id: string;
  title: string;
  description: string;
  status: string;
}

/**
 * Keywords that indicate backend work
 */
const backendKeywords = [
  "api",
  "endpoint",
  "database",
  "server",
  "backend",
  "auth",
  "authentication",
  "authorization",
  "query",
  "migration",
  "schema",
];

/**
 * Keywords that indicate frontend work
 */
const frontendKeywords = [
  "ui",
  "component",
  "frontend",
  "button",
  "form",
  "page",
  "view",
  "style",
  "css",
  "tailwind",
  "react",
  "modal",
  "dialog",
];

/**
 * Keywords that indicate QA work
 */
const qaKeywords = [
  "test",
  "testing",
  "qa",
  "e2e",
  "unit test",
  "integration test",
  "coverage",
  "playwright",
];

/**
 * Keywords that indicate architect work
 */
const architectKeywords = [
  "refactor",
  "architecture",
  "design",
  "optimize",
  "performance",
  "scalability",
  "pattern",
  "structure",
];

/**
 * Check if text contains any of the keywords as whole words
 * Uses word boundary matching to avoid false positives like "build" matching "ui"
 */
function containsKeyword(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerText);
  });
}

/**
 * Select agent role based on task
 *
 * Rules (MVP):
 * 1. Check title and description for keywords
 * 2. Priority: QA > Frontend > Backend > Architect
 * 3. Default: Backend (most common)
 */
export function selectAgent(task: TaskInfo): AgentRole {
  const combinedText = `${task.title} ${task.description}`;

  // QA has highest priority (specific domain)
  if (containsKeyword(combinedText, qaKeywords)) {
    return "qa";
  }

  // Frontend (UI-related)
  if (containsKeyword(combinedText, frontendKeywords)) {
    return "frontend";
  }

  // Backend (API/server-related)
  if (containsKeyword(combinedText, backendKeywords)) {
    return "backend";
  }

  // Architect (refactoring/design)
  if (containsKeyword(combinedText, architectKeywords)) {
    return "architect";
  }

  // Default fallback: backend
  return "backend";
}
