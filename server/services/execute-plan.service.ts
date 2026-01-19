/**
 * Execute Plan Service - Re-export module
 *
 * This file re-exports from the modular execute-plan/ directory
 * for backwards compatibility with existing imports.
 */

export {
  executePlan,
  getExecutionMode,
  isExecutePlanV2Enabled,
  getStableKey,
} from "./execute-plan";

export type {
  ExecutionMode,
  PlanTaskItem,
  ExecutePlanOptions,
  ExecutePlanResult,
} from "./execute-plan";
