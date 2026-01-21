/** Factory Worker Service (PR-86) - Background loop for autonomous execution */
import {
  FactoryWorkerRegistry,
  createWorkerHandle,
  type FactoryWorkerHandle,
} from "./factory-worker-registry";
import type { ResumeState } from "./factory-resume.service";

export interface TickOnceParams {
  projectId: string;
  runId: string;
  maxParallel: number;
  agentProfileId?: string;
}

export interface FactoryWorkerDeps {
  registry: FactoryWorkerRegistry;
  getResumeState: (projectId: string) => Promise<ResumeState>;
  tickOnce: (params: TickOnceParams) => Promise<void>;
  markRunFailed: (runId: string, error: string) => Promise<void>;
  sleepMs: (ms: number) => Promise<void>;
}

const LOOP_INTERVAL_MS = 1000;

/**
 * Factory Worker Service - manages background execution loops
 */
export class FactoryWorkerService {
  constructor(private deps: FactoryWorkerDeps) {}

  /**
   * Start or attach to existing worker for a project
   * Returns started=false if worker already running
   */
  async startOrAttach(params: {
    projectId: string;
    runId: string;
    maxParallel: number;
    agentProfileId?: string;
  }): Promise<{ started: boolean }> {
    const { projectId, runId, maxParallel, agentProfileId } = params;

    // Check if already running
    if (this.deps.registry.has(projectId)) {
      return { started: false };
    }

    // Create and register handle
    const handle = createWorkerHandle(projectId, runId);
    this.deps.registry.set(handle);

    // Start loop in background (fire-and-forget)
    this.runLoop(handle, maxParallel, agentProfileId).catch(() => {
      // Loop handles its own errors, just ensure cleanup
      this.deps.registry.delete(projectId);
    });

    return { started: true };
  }

  /**
   * Request stop for a project's worker
   */
  async requestStop(projectId: string): Promise<{ ok: boolean }> {
    const handle = this.deps.registry.get(projectId);
    if (!handle) {
      return { ok: false };
    }
    handle.requestStop();
    return { ok: true };
  }

  /**
   * Background loop that runs until stopped or run completes
   */
  private async runLoop(
    handle: FactoryWorkerHandle,
    maxParallel: number,
    agentProfileId?: string
  ): Promise<void> {
    const { projectId, runId } = handle;

    try {
      while (!handle.stopRequested) {
        // Check current state from DB
        const state = await this.deps.getResumeState(projectId);

        // Stop if run is no longer running
        if (!state.runId || state.status !== "running") {
          break;
        }

        // Execute one tick (non-blocking start of tasks)
        await this.deps.tickOnce({ projectId, runId, maxParallel, agentProfileId });

        // Sleep before next tick
        await this.deps.sleepMs(LOOP_INTERVAL_MS);
      }
    } catch (error) {
      // Mark run as failed on error
      const message = error instanceof Error ? error.message : "Unknown error";
      await this.deps.markRunFailed(runId, message);
    } finally {
      // Always clean up handle
      this.deps.registry.delete(projectId);
    }
  }
}
