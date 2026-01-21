/** Task Reorder Service (PR-104) - Database operations for task reordering */
import { computeReorder, type TaskPosition, type TaskUpdate } from "@/lib/task-reorder.logic";

export interface ColumnIndex {
  status: string;
  index: number;
}

export interface ReorderInput {
  taskId: string;
  from: ColumnIndex;
  to: ColumnIndex;
}

export interface TaskRecord {
  id: string;
  projectId: string;
  status: string;
  order: number;
}

export interface ReorderTaskDeps {
  getTaskById: (taskId: string) => Promise<TaskRecord | null>;
  getTasksByProject: (projectId: string) => Promise<TaskPosition[]>;
  updateTaskPositions: (updates: TaskUpdate[]) => Promise<boolean>;
}

const VALID_STATUSES = ["todo", "in_progress", "in_review", "done", "cancelled"];

export type ReorderResult = { ok: true } | { ok: false; error: string };

/**
 * Reorder a task within or across columns
 */
export async function reorderTask(
  projectId: string,
  input: ReorderInput,
  deps: ReorderTaskDeps
): Promise<ReorderResult> {
  // Validate input
  if (input.to.index < 0) {
    return { ok: false, error: "Invalid index" };
  }

  if (!VALID_STATUSES.includes(input.to.status)) {
    return { ok: false, error: "Invalid status" };
  }

  // Check task exists and belongs to project
  const task = await deps.getTaskById(input.taskId);
  if (!task) {
    return { ok: false, error: "Task not found" };
  }

  if (task.projectId !== projectId) {
    return { ok: false, error: "Task not in project" };
  }

  // Get all tasks in project for reordering
  const allTasks = await deps.getTasksByProject(projectId);

  // Compute the reorder updates
  const result = computeReorder(allTasks, input);

  if (result.error) {
    return { ok: false, error: result.error };
  }

  // No updates needed (no-op)
  if (result.updates.length === 0) {
    return { ok: true };
  }

  // Apply updates to database
  await deps.updateTaskPositions(result.updates);

  return { ok: true };
}
