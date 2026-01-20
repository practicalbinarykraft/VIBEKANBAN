/** Attempt Executor (PR-66) - Orchestrates attempt lifecycle */
import type { AttemptLogSink } from "./attempt-log-sink";
import type { AttemptArtifactStore } from "./attempt-artifact-store";
import type { AttemptStatusRepo } from "./attempt-status-repo";

export interface Runner {
  run(params: { attemptId: string; projectId: string; taskId: string }): Promise<{ exitCode: number; output: string }>;
}

export interface ExecuteParams {
  attemptId: string;
  taskId: string;
  projectId: string;
  runner: Runner;
  logSink: AttemptLogSink;
  artifactStore: AttemptArtifactStore;
  statusRepo: AttemptStatusRepo;
  now?: () => Date;
  timeout?: number;
}

export interface ExecuteResult {
  status: "succeeded" | "failed";
  artifactId?: string;
}

export class AttemptExecutor {
  async executeAttempt(params: ExecuteParams): Promise<ExecuteResult> {
    const {
      attemptId, taskId, projectId, runner,
      logSink, artifactStore, statusRepo,
      now = () => new Date(),
      timeout = 60000,
    } = params;

    const startedAt = now();
    await statusRepo.markRunning(attemptId, startedAt);

    let result: { exitCode: number; output: string };

    try {
      result = await Promise.race([
        runner.run({ attemptId, projectId, taskId }),
        this.createTimeout(timeout),
      ]);
    } catch (error: any) {
      const finishedAt = now();
      const errorMsg = error.message || "Unknown error";
      const isTimeout = errorMsg.includes("timeout");

      await artifactStore.save(attemptId, {
        kind: "error",
        data: { error: errorMsg, timestamp: finishedAt.toISOString() },
      });

      await statusRepo.markFailed(attemptId, finishedAt, errorMsg, isTimeout ? 124 : 1);

      return { status: "failed" };
    }

    const finishedAt = now();

    if (result.exitCode === 0) {
      const { artifactId } = await artifactStore.save(attemptId, {
        kind: "runner_output",
        data: { exitCode: result.exitCode, output: result.output },
      });

      await statusRepo.markSucceeded(attemptId, finishedAt, result.exitCode);

      return { status: "succeeded", artifactId };
    }

    const { artifactId } = await artifactStore.save(attemptId, {
      kind: "error",
      data: { exitCode: result.exitCode, output: result.output },
    });

    await statusRepo.markFailed(attemptId, finishedAt, `Exit code: ${result.exitCode}`, result.exitCode);

    return { status: "failed", artifactId };
  }

  async cancelAttempt(_attemptId: string): Promise<void> {
    // MVP: no-op
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Execution timeout")), ms);
    });
  }
}
