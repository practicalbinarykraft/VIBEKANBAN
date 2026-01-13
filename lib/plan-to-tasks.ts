/**
 * Plan to Tasks converter
 *
 * Pure function that converts plan steps to task definitions.
 * Deterministic: same input always produces same output.
 */

const MAX_TITLE_LENGTH = 80;

export interface TaskDefinition {
  title: string;
  description: string;
}

export interface PlanToTasksInput {
  projectId: string;
  planSteps: string[];
}

/**
 * Truncates a string to maxLength, adding "..." if truncated
 */
function truncateTitle(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  // Leave room for "..."
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Converts plan steps to task definitions
 *
 * Rules:
 * - Filters out empty/whitespace-only steps
 * - Title = trimmed step (truncated to 80 chars if needed)
 * - Description = full step text with acceptance criteria placeholder
 * - Deterministic: no randomness, same input → same output
 */
export function planToTasks(input: PlanToTasksInput): TaskDefinition[] {
  const { planSteps } = input;

  return planSteps
    .map((step) => step.trim())
    .filter((step) => step.length > 0)
    .map((step) => ({
      title: truncateTitle(step, MAX_TITLE_LENGTH),
      description: `${step}\n\nAcceptance criteria:\n- Task completed as described`,
    }));
}
