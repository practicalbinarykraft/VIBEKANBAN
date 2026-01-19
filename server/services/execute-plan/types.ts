/**
 * Execute Plan Types
 */

import { projects } from "@/server/db/schema";

export type ExecutionMode = "mock" | "real";

export interface PlanTaskItem {
  title: string;
  description: string;
  type: "backend" | "frontend" | "qa" | "design";
  estimate: "S" | "M" | "L";
}

export interface ExecutePlanOptions {
  planId: string;
  projectId: string;
  userId?: string;
}

export interface ExecutePlanResult {
  success: boolean;
  createdTaskIds: string[];
  attemptIds: string[];
  error?: string;
  alreadyExecuted?: boolean;
}

export interface CreateAttemptOptions {
  taskId: string;
  task: PlanTaskItem;
  project: typeof projects.$inferSelect;
  userId?: string;
  mode: ExecutionMode;
}

export interface ExistingTaskInfo {
  id: string;
  hasAttempt: boolean;
}
