/** Factory Scheduler Types (PR-82) */

export interface FactoryRunResult {
  autopilotRunId: string;
  total: number;
  started: number;
  completed: number;
  failed: number;
  cancelled: number;
  attemptIds: string[];
}

export interface FactorySchedulerOptions {
  projectId: string;
  autopilotRunId: string;
  maxParallel: number;
}

export interface AttemptResult {
  taskId: string;
  attemptId: string | null;
  success: boolean;
  error?: string;
}
