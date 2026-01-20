/**
 * Attempt Runtime Registry (PR-72)
 * In-memory storage for runtime handles to enable real cancellation.
 */

export type RuntimeHandle = {
  kind: "local" | "docker";
  stop: () => Promise<void>;
};

const registry = new Map<string, RuntimeHandle>();

/**
 * Register a runtime handle for an attempt
 */
export function registerAttemptRuntime(
  attemptId: string,
  handle: RuntimeHandle
): void {
  registry.set(attemptId, handle);
}

/**
 * Get the runtime handle for an attempt
 */
export function getAttemptRuntime(attemptId: string): RuntimeHandle | null {
  return registry.get(attemptId) ?? null;
}

/**
 * Unregister the runtime handle for an attempt
 */
export function unregisterAttemptRuntime(attemptId: string): void {
  registry.delete(attemptId);
}

/**
 * Clear all registry entries (for testing)
 */
export function clearRegistry(): void {
  registry.clear();
}
