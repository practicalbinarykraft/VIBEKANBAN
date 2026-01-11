import Docker from "dockerode";
import { EventEmitter } from "events";
import { randomUUID } from "crypto";

const docker = new Docker();

export interface RunnerOptions {
  image?: string;
  command?: string[];
  workdir?: string;
  env?: Record<string, string>;
  enableNetwork?: boolean;
  binds?: string[]; // Host paths to mount, format: ["host_path:container_path:rw"]
}

export interface LogEntry {
  timestamp: Date;
  level: "info" | "warning" | "error";
  message: string;
}

export class DockerRunner extends EventEmitter {
  private containerId: string | null = null;
  private containerName: string;

  constructor() {
    super();
    this.containerName = `vibe-kanban-${randomUUID().slice(0, 8)}`;
  }

  async run(options: RunnerOptions = {}): Promise<{ exitCode: number; containerId: string }> {
    const {
      image = "vibe-agent-runner:latest",
      command = ["sh", "-c", "echo 'Starting task...' && sleep 2 && echo 'Running tests...' && sleep 3 && echo 'Task completed successfully!' && exit 0"],
      workdir = "/workspace",
      env = {},
      enableNetwork = false,
      binds = [],
    } = options;

    this.emit("log", {
      timestamp: new Date(),
      level: "info",
      message: `Initializing Docker container: ${this.containerName}`,
    });

    this.emit("log", {
      timestamp: new Date(),
      level: "info",
      message: `Network: ${enableNetwork ? "enabled" : "disabled"}`,
    });

    try {
      // Create container
      const container = await docker.createContainer({
        Image: image,
        name: this.containerName,
        Cmd: command,
        WorkingDir: workdir,
        Env: Object.entries(env).map(([key, value]) => `${key}=${value}`),
        HostConfig: {
          AutoRemove: false, // Don't auto-remove - we need to exec commands after completion
          NetworkMode: enableNetwork ? "bridge" : "none",
          Binds: binds.length > 0 ? binds : undefined,
        },
      });

      this.containerId = container.id;
      this.emit("log", {
        timestamp: new Date(),
        level: "info",
        message: `Container created: ${this.containerId.slice(0, 12)}`,
      });

      // Attach to container to stream logs
      const stream = await container.attach({
        stream: true,
        stdout: true,
        stderr: true,
      });

      // Handle log streaming
      stream.on("data", (chunk: Buffer) => {
        // Docker multiplexes stdout/stderr - first byte indicates stream type
        const message = chunk.slice(8).toString("utf-8").trim();
        if (message) {
          this.emit("log", {
            timestamp: new Date(),
            level: "info",
            message,
          });
        }
      });

      this.emit("log", {
        timestamp: new Date(),
        level: "info",
        message: "Starting container...",
      });

      // Start container
      await container.start();

      this.emit("log", {
        timestamp: new Date(),
        level: "info",
        message: "Container started, executing task...",
      });

      // Wait for container to finish
      const result = await container.wait();
      const exitCode = result.StatusCode;

      this.emit("log", {
        timestamp: new Date(),
        level: exitCode === 0 ? "info" : "error",
        message: `Container finished with exit code: ${exitCode}`,
      });

      return { exitCode, containerId: this.containerId };
    } catch (error: any) {
      this.emit("log", {
        timestamp: new Date(),
        level: "error",
        message: `Docker error: ${error.message}`,
      });
      throw error;
    }
  }

  async exec(command: string[]): Promise<string> {
    if (!this.containerId) {
      throw new Error("No container running");
    }

    try {
      const container = docker.getContainer(this.containerId);
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ hijack: false, stdin: false });

      return new Promise((resolve, reject) => {
        let output = "";
        stream.on("data", (chunk: Buffer) => {
          // Docker multiplexes stdout/stderr - first byte indicates stream type
          const message = chunk.slice(8).toString("utf-8");
          output += message;
        });

        stream.on("end", () => {
          resolve(output);
        });

        stream.on("error", (err: Error) => {
          reject(err);
        });
      });
    } catch (error: any) {
      throw new Error(`Exec error: ${error.message}`);
    }
  }

  async cleanup(): Promise<void> {
    if (!this.containerId) {
      return;
    }

    try {
      const container = docker.getContainer(this.containerId);
      await container.remove({ force: true });
      this.emit("log", {
        timestamp: new Date(),
        level: "info",
        message: "Container cleaned up",
      });
    } catch (error: any) {
      console.error("Error removing container:", error.message);
    }
  }

  async stop(): Promise<void> {
    if (!this.containerId) {
      return;
    }

    try {
      const container = docker.getContainer(this.containerId);
      await container.stop();
      this.emit("log", {
        timestamp: new Date(),
        level: "info",
        message: "Container stopped",
      });
    } catch (error: any) {
      // Container might already be stopped/removed
      console.error("Error stopping container:", error.message);
    }
  }

  getContainerId(): string | null {
    return this.containerId;
  }
}
