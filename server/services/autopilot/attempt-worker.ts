/** Attempt Worker (PR-66) - In-memory queue for sequential execution */
import { AttemptExecutor } from "./attempt-executor";
import { AttemptLogSink } from "./attempt-log-sink";
import { AttemptArtifactStore } from "./attempt-artifact-store";
import { AttemptStatusRepo } from "./attempt-status-repo";
import { LocalRunner } from "@/server/services/execution/local-runner";

export interface QueueItem {
  attemptId: string;
  taskId: string;
  projectId: string;
}

export class AttemptWorker {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private executor: AttemptExecutor;
  private stopped = false;

  constructor(executor?: AttemptExecutor) {
    this.executor = executor ?? new AttemptExecutor();
  }

  enqueue(item: QueueItem): void {
    this.queue.push(item);
    this.process();
  }

  queueSize(): number {
    return this.queue.length;
  }

  stop(): void {
    this.stopped = true;
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.stopped) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && !this.stopped) {
      const item = this.queue.shift();
      if (!item) continue;

      try {
        await this.executor.executeAttempt({
          attemptId: item.attemptId,
          taskId: item.taskId,
          projectId: item.projectId,
          runner: this.createRunner(),
          logSink: new AttemptLogSink(),
          artifactStore: new AttemptArtifactStore(),
          statusRepo: new AttemptStatusRepo(),
          timeout: 120000,
        });
      } catch {
        // Continue processing even if one attempt fails
      }
    }

    this.isProcessing = false;
  }

  private createRunner(): { run: (params: any) => Promise<{ exitCode: number; output: string }> } {
    return {
      run: async (params: { attemptId: string; projectId: string; taskId: string }) => {
        const runner = new LocalRunner();
        const logs: string[] = [];
        runner.on("log", (entry: { message: string }) => {
          logs.push(entry.message);
        });
        const result = await runner.run({
          command: ["echo", `Executing task ${params.taskId}`],
          timeout: 60000,
        });
        await runner.cleanup();
        return { exitCode: result.exitCode, output: logs.join("\n") };
      },
    };
  }
}

// Singleton instance
let workerInstance: AttemptWorker | null = null;

export function getAttemptWorker(): AttemptWorker {
  if (!workerInstance) {
    workerInstance = new AttemptWorker();
  }
  return workerInstance;
}
