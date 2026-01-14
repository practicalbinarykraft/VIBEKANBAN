/**
 * Plan to Tasks converter
 *
 * Pure function that converts plan steps to enriched task definitions.
 * Deterministic: same input always produces same output.
 */

const MAX_TITLE_LENGTH = 80;

export type Estimate = 'S' | 'M' | 'L';
export type Priority = 'P1' | 'P2' | 'P3';

export interface TaskDefinition {
  title: string;
  description: string;
  estimate: Estimate;
  priority: Priority;
  tags: string[];
  order: number;
}

export interface PlanToTasksInput {
  projectId: string;
  planSteps: string[];
}

// Tag detection keywords
const TAG_KEYWORDS: Record<string, string[]> = {
  backend: ['api', 'auth', 'database', 'server'],
  frontend: ['component', 'page', 'ui', 'form'],
  infra: ['docker', 'ci', 'deploy', 'migrate'],
  design: ['design', 'ux', 'mockup'],
};

/**
 * Truncates a string to maxLength, adding "..." if truncated
 */
function truncateTitle(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Determines estimate based on step text length
 * <30 chars → S, 30-80 chars → M, >80 chars → L
 */
function determineEstimate(step: string): Estimate {
  const len = step.length;
  if (len < 30) return 'S';
  if (len <= 80) return 'M';
  return 'L';
}

/**
 * Determines priority based on position
 * i=1 → P1, i=N → P3 (if N>1), otherwise → P2
 */
function determinePriority(index: number, total: number): Priority {
  const position = index + 1; // 1-based
  if (position === 1) return 'P1';
  if (total > 1 && position === total) return 'P3';
  return 'P2';
}

/**
 * Detects tags from step text using keyword matching
 * Returns sorted unique array of tags
 */
function detectTags(step: string): string[] {
  const lowerStep = step.toLowerCase();
  const foundTags = new Set<string>();

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerStep.includes(keyword)) {
        foundTags.add(tag);
        break; // Found this tag, move to next tag category
      }
    }
  }

  return Array.from(foundTags).sort();
}

/**
 * Converts plan steps to enriched task definitions
 *
 * Rules:
 * - Filters out empty/whitespace-only steps
 * - Title = trimmed step (truncated to 80 chars if needed)
 * - Description = full step text with acceptance criteria placeholder
 * - order = 1-based index
 * - estimate = S/M/L based on text length
 * - priority = P1/P2/P3 based on position
 * - tags = detected from keywords, sorted unique array
 * - Deterministic: no randomness, same input → same output
 */
export function planToTasks(input: PlanToTasksInput): TaskDefinition[] {
  const { planSteps } = input;

  const filteredSteps = planSteps
    .map((step) => step.trim())
    .filter((step) => step.length > 0);

  const total = filteredSteps.length;

  return filteredSteps.map((step, index) => ({
    title: truncateTitle(step, MAX_TITLE_LENGTH),
    description: `${step}\n\nAcceptance criteria:\n- Task completed as described`,
    estimate: determineEstimate(step),
    priority: determinePriority(index, total),
    tags: detectTags(step),
    order: index + 1,
  }));
}
