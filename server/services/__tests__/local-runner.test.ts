/**
 * LocalRunner Tests (PR-60)
 * TDD for simple command execution runner
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LocalRunner, LogEntry } from "../execution/local-runner";

describe("LocalRunner", () => {
  let runner: LocalRunner;

  beforeEach(() => {
    runner = new LocalRunner();
  });

  afterEach(async () => {
    await runner.cleanup();
  });

  describe("run() - success path", () => {
    it("executes command and returns exitCode 0", async () => {
      const result = await runner.run({
        command: ["node", "-e", "console.log('ok')"],
      });

      expect(result.exitCode).toBe(0);
    });

    it("captures stdout as info log", async () => {
      const logs: LogEntry[] = [];
      runner.on("log", (entry) => logs.push(entry));

      await runner.run({
        command: ["node", "-e", "console.log('hello world')"],
      });

      expect(logs.some((l) => l.level === "info" && l.message.includes("hello world"))).toBe(true);
    });

    it("emits logs in real-time", async () => {
      const logs: LogEntry[] = [];
      runner.on("log", (entry) => logs.push(entry));

      await runner.run({
        command: ["node", "-e", "console.log('line1'); console.log('line2')"],
      });

      expect(logs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("run() - failure path", () => {
    it("returns non-zero exitCode on command failure", async () => {
      const result = await runner.run({
        command: ["node", "-e", "process.exit(1)"],
      });

      expect(result.exitCode).toBe(1);
    });

    it("captures stderr as error log", async () => {
      const logs: LogEntry[] = [];
      runner.on("log", (entry) => logs.push(entry));

      await runner.run({
        command: ["node", "-e", "console.error('error message')"],
      });

      expect(logs.some((l) => l.level === "error" && l.message.includes("error message"))).toBe(true);
    });

    it("handles command not found", async () => {
      const result = await runner.run({
        command: ["nonexistent-command-xyz-123"],
      });

      expect(result.exitCode).not.toBe(0);
    });
  });

  describe("run() - environment", () => {
    it("passes environment variables to command", async () => {
      const logs: LogEntry[] = [];
      runner.on("log", (entry) => logs.push(entry));

      await runner.run({
        command: ["node", "-e", "console.log(process.env.TEST_VAR)"],
        env: { TEST_VAR: "test-value-123" },
      });

      expect(logs.some((l) => l.message.includes("test-value-123"))).toBe(true);
    });

    it("uses cwd when provided", async () => {
      const logs: LogEntry[] = [];
      runner.on("log", (entry) => logs.push(entry));

      await runner.run({
        command: ["node", "-e", "console.log(process.cwd())"],
        cwd: "/tmp",
      });

      expect(logs.some((l) => l.message.includes("/tmp") || l.message.includes("/private/tmp"))).toBe(true);
    });
  });

  describe("cleanup()", () => {
    it("can be called multiple times safely", async () => {
      await runner.run({
        command: ["node", "-e", "console.log('ok')"],
      });

      await runner.cleanup();
      await runner.cleanup(); // Should not throw
    });
  });

  describe("stop()", () => {
    it("stops running process", async () => {
      const runPromise = runner.run({
        command: ["node", "-e", "setTimeout(() => {}, 10000)"],
      });

      // Give process time to start
      await new Promise((r) => setTimeout(r, 100));

      await runner.stop();
      const result = await runPromise;

      // Process should be terminated (signal exit code varies by OS)
      expect(result.exitCode).not.toBe(0);
    });
  });
});
