/**
 * Task Sorting Helper
 *
 * Pure functions for sorting tasks by order.
 * Tasks with null/undefined order are pushed to the end.
 */

interface TaskWithOrder {
  order?: number | null;
  [key: string]: unknown;
}

/**
 * Compares two tasks by order for sorting.
 * Returns negative if a should come before b, positive if after, 0 if equal.
 * Null/undefined orders are pushed to end.
 */
export function compareTaskOrder(
  a: TaskWithOrder,
  b: TaskWithOrder
): number {
  const aHasOrder = a.order != null;
  const bHasOrder = b.order != null;

  // Both have order: compare numerically
  if (aHasOrder && bHasOrder) {
    return a.order! - b.order!;
  }
  // Only a has order: a comes first
  if (aHasOrder && !bHasOrder) {
    return -1;
  }
  // Only b has order: b comes first
  if (!aHasOrder && bHasOrder) {
    return 1;
  }
  // Neither has order: equal
  return 0;
}

/**
 * Sorts an array of tasks by order ascending.
 * Does not mutate the original array.
 * Tasks with null/undefined order go to the end.
 */
export function sortTasksByOrder<T extends TaskWithOrder>(tasks: T[]): T[] {
  return [...tasks].sort(compareTaskOrder);
}
