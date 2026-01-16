/**
 * Plan Validation
 *
 * Validates plan quality before allowing Confirm/Approve.
 * All checks are deterministic - same input always gives same output.
 */

export interface ValidationReason {
  code: "min_tasks" | "no_placeholders" | "verbish" | "unique";
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  reasons: ValidationReason[];
}

const MIN_TASKS = 10;

const PLACEHOLDER_PATTERNS = [
  /\btbd\b/i,
  /\btodo\b/i,
  /\.\.\./,
  /\bplaceholder\b/i,
  /\blorem\b/i,
];

// Known verb-ish words that are acceptable
const KNOWN_VERBS = new Set([
  "create", "implement", "add", "configure", "write",
  "build", "refactor", "test", "deploy", "fix", "update", "set",
]);

// Pattern: starts with capitalized word (at least 2 chars)
const VERBISH_PATTERN = /^[A-Z][a-z]+/;

function checkMinTasks(steps: string[]): ValidationReason | null {
  if (steps.length < MIN_TASKS) {
    return {
      code: "min_tasks",
      message: `Plan must have at least ${MIN_TASKS} tasks (got ${steps.length})`,
    };
  }
  return null;
}

function checkNoPlaceholders(steps: string[]): ValidationReason | null {
  for (const step of steps) {
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(step)) {
        return {
          code: "no_placeholders",
          message: "Plan contains placeholder text (TBD, TODO, ..., placeholder, lorem)",
        };
      }
    }
  }
  return null;
}

function checkVerbish(steps: string[]): ValidationReason | null {
  for (const step of steps) {
    const trimmed = step.trim();
    if (!trimmed) continue;

    const firstWord = trimmed.split(/\s+/)[0];
    // Must start with capitalized letter AND either be a known verb or match pattern
    const startsCapitalized = /^[A-Z]/.test(firstWord);
    const isKnownVerb = KNOWN_VERBS.has(firstWord.toLowerCase());
    const matchesPattern = VERBISH_PATTERN.test(firstWord);

    // Require capitalization first, then either known verb or pattern
    if (!startsCapitalized || (!isKnownVerb && !matchesPattern)) {
      return {
        code: "verbish",
        message: `Each task must start with a capitalized action word (found: "${firstWord}")`,
      };
    }
  }
  return null;
}

function checkUnique(steps: string[]): ValidationReason | null {
  const seen = new Set<string>();
  for (const step of steps) {
    const normalized = step.trim().toLowerCase();
    if (seen.has(normalized)) {
      return {
        code: "unique",
        message: "Plan contains duplicate tasks",
      };
    }
    seen.add(normalized);
  }
  return null;
}

export function validatePlan(planSteps: string[]): ValidationResult {
  const reasons: ValidationReason[] = [];

  const minTasksReason = checkMinTasks(planSteps);
  if (minTasksReason) reasons.push(minTasksReason);

  const placeholdersReason = checkNoPlaceholders(planSteps);
  if (placeholdersReason) reasons.push(placeholdersReason);

  const verbishReason = checkVerbish(planSteps);
  if (verbishReason) reasons.push(verbishReason);

  const uniqueReason = checkUnique(planSteps);
  if (uniqueReason) reasons.push(uniqueReason);

  return {
    ok: reasons.length === 0,
    reasons,
  };
}
