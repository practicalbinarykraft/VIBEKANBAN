import { EventEmitter } from "events";
import { randomUUID } from "crypto";

export interface LogEntry {
  timestamp: Date;
  level: "info" | "warning" | "error";
  message: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * StubRunner - Simulates DockerRunner for E2E tests
 *
 * Used when PLAYWRIGHT=1 to avoid Docker dependency.
 * Emits logs with delays to simulate realistic execution time.
 */
export class StubRunner extends EventEmitter {
  private containerId: string | null = null;

  async run(): Promise<{ exitCode: number; containerId: string }> {
    this.containerId = `stub-${randomUUID().slice(0, 8)}`;

    const logs = [
      "Initializing task execution (stub mode)",
      "Agent analyzing task...",
      "Generating solution...",
      "Writing changes...",
      "Task completed successfully!",
    ];

    // Emit logs with delays to allow tests to observe in_progress state
    for (const message of logs) {
      this.emit("log", {
        timestamp: new Date(),
        level: "info",
        message,
      } as LogEntry);
      await sleep(500); // 500ms between logs = ~2.5s total
    }

    return { exitCode: 0, containerId: this.containerId };
  }

  async exec(): Promise<string> {
    return "stub exec output";
  }

  async cleanup(): Promise<void> {
    this.emit("log", {
      timestamp: new Date(),
      level: "info",
      message: "Container cleaned up (stub)",
    });
  }

  async stop(): Promise<void> {
    this.emit("log", {
      timestamp: new Date(),
      level: "info",
      message: "Container stopped (stub)",
    });
  }

  getContainerId(): string | null {
    return this.containerId;
  }
}
