/**
 * Plan to Tasks converter
 *
 * Pure function that converts plan steps to task definitions.
 * Deterministic: same input always produces same output.
 *
 * Enrichment rules:
 * - order: 1-based index
 * - estimate: S (<30 chars), M (30-80 chars), L (>80 chars)
 * - priority: P1 (first), P3 (last), P2 (middle)
 * - tags: extracted from keywords, sorted unique
 */

const MAX_TITLE_LENGTH = 80;

export type Estimate = 'S' | 'M' | 'L';
export type Priority = 'P1' | 'P2' | 'P3';

export interface TaskDefinition {
  title: string;
  description: string;
  order: number;
  estimate: Estimate;
  priority: Priority;
  tags: string[];
}

export interface PlanToTasksInput {
  projectId: string;
  planSteps: string[];
}

const TAG_KEYWORDS: Record<string, string[]> = {
  backend: ['api', 'auth', 'database', 'server', 'endpoint'],
  frontend: ['component', 'page', 'ui', 'form', 'button'],
  infra: ['docker', 'ci', 'deploy', 'migrate', 'config'],
  design: ['design', 'ux', 'mockup', 'style'],
};

function truncateTitle(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

function determineEstimate(step: string): Estimate {
  const len = step.length;
  if (len < 30) return 'S';
  if (len <= 80) return 'M';
  return 'L';
}

function determinePriority(index: number, total: number): Priority {
  if (index === 0) return 'P1';
  if (total > 1 && index === total - 1) return 'P3';
  return 'P2';
}

function extractTags(step: string): string[] {
  const lowerStep = step.toLowerCase();
  const foundTags: string[] = [];

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((kw) => lowerStep.includes(kw))) {
      foundTags.push(tag);
    }
  }

  return foundTags.sort();
}

/**
 * Converts plan steps to task definitions with enrichment
 */
export function planToTasks(input: PlanToTasksInput): TaskDefinition[] {
  const { planSteps } = input;

  const validSteps = planSteps
    .map((step) => step.trim())
    .filter((step) => step.length > 0);

  const total = validSteps.length;

  return validSteps.map((step, index) => ({
    title: truncateTitle(step, MAX_TITLE_LENGTH),
    description: `${step}\n\nAcceptance criteria:\n- Task completed as described`,
    order: index + 1,
    estimate: determineEstimate(step),
    priority: determinePriority(index, total),
    tags: extractTags(step),
  }));
}
