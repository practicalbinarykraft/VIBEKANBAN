/** Task Reorder Logic (PR-104) - Pure functions for computing reorder updates */

export interface TaskPosition {
  id: string;
  status: string;
  order: number;
}

export interface ColumnIndex {
  status: string;
  index: number;
}

export interface ReorderInput {
  taskId: string;
  from: ColumnIndex;
  to: ColumnIndex;
}

export interface TaskUpdate {
  id: string;
  status: string;
  order: number;
}

export interface ReorderResult {
  updates: TaskUpdate[];
  error?: string;
}

/**
 * Compute the updates needed to reorder tasks
 * Pure function - no side effects
 */
export function computeReorder(
  tasks: TaskPosition[],
  input: ReorderInput
): ReorderResult {
  const { taskId, from, to } = input;

  // Find the task being moved
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return { updates: [], error: "Task not found" };
  }

  // No-op: same position
  if (from.status === to.status && from.index === to.index) {
    return { updates: [] };
  }

  const isSameColumn = from.status === to.status;

  if (isSameColumn) {
    return computeSameColumnReorder(tasks, taskId, from.status, from.index, to.index);
  } else {
    return computeCrossColumnReorder(tasks, taskId, from, to);
  }
}

function computeSameColumnReorder(
  tasks: TaskPosition[],
  taskId: string,
  status: string,
  fromIndex: number,
  toIndex: number
): ReorderResult {
  // Get tasks in this column, sorted by order
  const columnTasks = tasks
    .filter((t) => t.status === status)
    .sort((a, b) => a.order - b.order);

  // Remove the moving task and reinsert at new position
  const taskIds = columnTasks.map((t) => t.id);
  const currentIdx = taskIds.indexOf(taskId);
  if (currentIdx === -1) {
    return { updates: [], error: "Task not in column" };
  }

  taskIds.splice(currentIdx, 1);
  taskIds.splice(toIndex, 0, taskId);

  // Generate updates with normalized order values
  const updates: TaskUpdate[] = taskIds.map((id, index) => ({
    id,
    status,
    order: index,
  }));

  return { updates };
}

function computeCrossColumnReorder(
  tasks: TaskPosition[],
  taskId: string,
  from: ColumnIndex,
  to: ColumnIndex
): ReorderResult {
  const updates: TaskUpdate[] = [];

  // Get source column tasks (excluding the moving task)
  const sourceColumnTasks = tasks
    .filter((t) => t.status === from.status && t.id !== taskId)
    .sort((a, b) => a.order - b.order);

  // Reindex source column
  sourceColumnTasks.forEach((t, index) => {
    updates.push({ id: t.id, status: from.status, order: index });
  });

  // Get target column tasks
  const targetColumnTasks = tasks
    .filter((t) => t.status === to.status)
    .sort((a, b) => a.order - b.order);

  // Insert the moving task at the target index
  const targetIds = targetColumnTasks.map((t) => t.id);
  targetIds.splice(to.index, 0, taskId);

  // Reindex target column
  targetIds.forEach((id, index) => {
    updates.push({ id, status: to.status, order: index });
  });

  return { updates };
}
