/** Factory Worker Registry (PR-86) - In-memory registry for worker handles */

export interface FactoryWorkerHandle {
  projectId: string;
  runId: string;
  stopRequested: boolean;
  requestStop(): void;
}

/**
 * Create a new worker handle with stop control
 */
export function createWorkerHandle(
  projectId: string,
  runId: string
): FactoryWorkerHandle {
  const handle: FactoryWorkerHandle = {
    projectId,
    runId,
    stopRequested: false,
    requestStop() {
      handle.stopRequested = true;
    },
  };
  return handle;
}

/**
 * Registry for active factory workers
 * Stores worker handles by projectId for deduplication and stop control
 */
export class FactoryWorkerRegistry {
  private handles = new Map<string, FactoryWorkerHandle>();

  /**
   * Get worker handle for a project
   */
  get(projectId: string): FactoryWorkerHandle | null {
    return this.handles.get(projectId) ?? null;
  }

  /**
   * Store worker handle
   */
  set(handle: FactoryWorkerHandle): void {
    this.handles.set(handle.projectId, handle);
  }

  /**
   * Remove worker handle
   */
  delete(projectId: string): void {
    this.handles.delete(projectId);
  }

  /**
   * List all active handles
   */
  list(): FactoryWorkerHandle[] {
    return Array.from(this.handles.values());
  }

  /**
   * Check if project has active worker
   */
  has(projectId: string): boolean {
    return this.handles.has(projectId);
  }
}

// Singleton instance for global access
let globalRegistry: FactoryWorkerRegistry | null = null;

export function getGlobalWorkerRegistry(): FactoryWorkerRegistry {
  if (!globalRegistry) {
    globalRegistry = new FactoryWorkerRegistry();
  }
  return globalRegistry;
}

export function setGlobalWorkerRegistry(registry: FactoryWorkerRegistry | null): void {
  globalRegistry = registry;
}
