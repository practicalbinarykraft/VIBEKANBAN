/** Factory Queue Service (PR-85, PR-92) - In-memory queue with slot management */

export interface FactoryQueueDeps {
  now(): Date;
}

export interface EnqueueResult {
  accepted: boolean;
  reason?: "DUPLICATE";
}

export interface QueueState {
  maxParallel: number;
  queued: string[];
  running: string[];
  counts: { queued: number; running: number };
}

/**
 * Manages factory task queue with strict maxParallel enforcement,
 * FIFO ordering, deduplication, and hard-stop support.
 */
export class FactoryQueueService {
  private queued: string[] = [];
  private running: Set<string> = new Set();
  private maxParallel: number = 1;
  private runId: string | null = null;
  private stopped: boolean = false;

  constructor(private deps: FactoryQueueDeps) {}

  /**
   * Initialize/resume queue state from persisted data
   */
  resume(params: {
    runId: string;
    queuedTaskIds: string[];
    runningTaskIds: string[];
    maxParallel: number;
  }): void {
    this.runId = params.runId;
    this.queued = [...params.queuedTaskIds];
    this.running = new Set(params.runningTaskIds);
    this.maxParallel = params.maxParallel;
  }

  /**
   * Enqueue a task in FIFO order with deduplication
   * Returns { accepted: false, reason: "DUPLICATE" } if task already queued or running
   */
  enqueue(taskId: string): EnqueueResult {
    // Check for duplicate in queued
    if (this.queued.includes(taskId)) {
      return { accepted: false, reason: "DUPLICATE" };
    }
    // Check for duplicate in running
    if (this.running.has(taskId)) {
      return { accepted: false, reason: "DUPLICATE" };
    }
    this.queued.push(taskId);
    return { accepted: true };
  }

  /**
   * Take next task from queue if a slot is available
   * Returns null if queue empty, running >= maxParallel, or stopped (PR-92)
   */
  popNext(): string | null {
    if (this.stopped) {
      return null;
    }
    if (this.running.size >= this.maxParallel) {
      return null;
    }
    if (this.queued.length === 0) {
      return null;
    }
    return this.queued.shift()!;
  }

  /**
   * Stop the queue - popNext will return null (PR-92)
   * Tasks remain in queue but won't be started
   */
  stop(): void {
    this.stopped = true;
  }

  /**
   * Check if queue is stopped (PR-92)
   */
  isStopped(): boolean {
    return this.stopped;
  }

  /**
   * Mark a task as running (occupies a slot)
   */
  markRunning(taskId: string): void {
    this.running.add(taskId);
  }

  /**
   * Mark a task as finished (frees a slot)
   */
  markFinished(taskId: string): void {
    this.running.delete(taskId);
  }

  /**
   * Get current queue state for status/UI
   */
  getState(): QueueState {
    return {
      maxParallel: this.maxParallel,
      queued: [...this.queued],
      running: Array.from(this.running),
      counts: {
        queued: this.queued.length,
        running: this.running.size,
      },
    };
  }

  /**
   * Clear all state (for hard stop)
   */
  clearAll(): void {
    this.queued = [];
    this.running.clear();
  }

  /**
   * Check if queue has pending or running tasks
   */
  hasWork(): boolean {
    return this.queued.length > 0 || this.running.size > 0;
  }

  /**
   * Get current run ID
   */
  getRunId(): string | null {
    return this.runId;
  }
}
