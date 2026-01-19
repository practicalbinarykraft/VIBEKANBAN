/**
 * LocalRunner (PR-60)
 * Simple command execution runner using child_process.spawn
 *
 * Responsibility: Execute shell commands, capture stdout/stderr as logs, return exitCode.
 * No Docker dependency. Emits logs in real-time via EventEmitter.
 */
import { EventEmitter } from "events";
import { spawn, ChildProcess } from "child_process";

export interface LogEntry {
  timestamp: Date;
  level: "info" | "warning" | "error";
  message: string;
}

export interface RunOptions {
  command: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface RunResult {
  exitCode: number;
  signal?: string;
}

/**
 * LocalRunner - Executes commands locally via child_process
 *
 * Usage:
 *   const runner = new LocalRunner();
 *   runner.on("log", (entry) => console.log(entry.message));
 *   const result = await runner.run({ command: ["node", "-e", "console.log('ok')"] });
 */
export class LocalRunner extends EventEmitter {
  private process: ChildProcess | null = null;
  private stopped = false;

  /**
   * Run command and capture output
   */
  async run(options: RunOptions): Promise<RunResult> {
    const { command, cwd, env, timeout } = options;

    if (command.length === 0) {
      return { exitCode: 1 };
    }

    const [cmd, ...args] = command;

    return new Promise((resolve) => {
      this.stopped = false;

      try {
        this.process = spawn(cmd, args, {
          cwd: cwd || process.cwd(),
          env: { ...process.env, ...env },
          shell: false,
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch (error: any) {
        this.emitLog("error", `Failed to spawn: ${error.message}`);
        resolve({ exitCode: 1 });
        return;
      }

      // Capture stdout
      this.process.stdout?.on("data", (data: Buffer) => {
        const lines = data.toString().split("\n").filter((l) => l.trim());
        for (const line of lines) {
          this.emitLog("info", line);
        }
      });

      // Capture stderr
      this.process.stderr?.on("data", (data: Buffer) => {
        const lines = data.toString().split("\n").filter((l) => l.trim());
        for (const line of lines) {
          this.emitLog("error", line);
        }
      });

      // Handle process error (e.g., command not found)
      this.process.on("error", (error: Error) => {
        this.emitLog("error", `Process error: ${error.message}`);
        resolve({ exitCode: 127 }); // Command not found convention
      });

      // Handle process exit
      this.process.on("close", (code, signal) => {
        this.process = null;
        resolve({
          exitCode: this.stopped ? 130 : (code ?? 1),
          signal: signal || undefined,
        });
      });

      // Timeout handling
      if (timeout && timeout > 0) {
        setTimeout(() => {
          if (this.process) {
            this.emitLog("error", `Process timed out after ${timeout}ms`);
            this.stop();
          }
        }, timeout);
      }
    });
  }

  /**
   * Stop the running process
   */
  async stop(): Promise<void> {
    if (this.process) {
      this.stopped = true;
      this.process.kill("SIGTERM");
      // Force kill after 2s
      setTimeout(() => {
        if (this.process) {
          this.process.kill("SIGKILL");
        }
      }, 2000);
    }
  }

  /**
   * Cleanup resources (noop for local runner, but keeps interface compatible)
   */
  async cleanup(): Promise<void> {
    await this.stop();
    this.removeAllListeners();
  }

  private emitLog(level: LogEntry["level"], message: string) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
    };
    this.emit("log", entry);
  }
}
