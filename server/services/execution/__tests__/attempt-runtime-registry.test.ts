/**
 * Attempt Runtime Registry Tests (PR-72)
 * TDD: Tests written before implementation
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerAttemptRuntime,
  getAttemptRuntime,
  unregisterAttemptRuntime,
  clearRegistry,
  type RuntimeHandle,
} from "../attempt-runtime-registry";

describe("attempt-runtime-registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("registers and retrieves a runtime handle", () => {
    const handle: RuntimeHandle = {
      kind: "local",
      stop: vi.fn().mockResolvedValue(undefined),
    };

    registerAttemptRuntime("attempt-1", handle);
    const retrieved = getAttemptRuntime("attempt-1");

    expect(retrieved).toBe(handle);
    expect(retrieved?.kind).toBe("local");
  });

  it("returns null for unregistered attempt", () => {
    const result = getAttemptRuntime("non-existent");
    expect(result).toBeNull();
  });

  it("unregisters a runtime handle", () => {
    const handle: RuntimeHandle = {
      kind: "local",
      stop: vi.fn().mockResolvedValue(undefined),
    };

    registerAttemptRuntime("attempt-2", handle);
    expect(getAttemptRuntime("attempt-2")).toBe(handle);

    unregisterAttemptRuntime("attempt-2");
    expect(getAttemptRuntime("attempt-2")).toBeNull();
  });

  it("overwrites handle when registering same attemptId", () => {
    const handle1: RuntimeHandle = {
      kind: "local",
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const handle2: RuntimeHandle = {
      kind: "docker",
      stop: vi.fn().mockResolvedValue(undefined),
    };

    registerAttemptRuntime("attempt-3", handle1);
    registerAttemptRuntime("attempt-3", handle2);

    const retrieved = getAttemptRuntime("attempt-3");
    expect(retrieved).toBe(handle2);
    expect(retrieved?.kind).toBe("docker");
  });

  it("unregister on missing id does not throw", () => {
    expect(() => unregisterAttemptRuntime("missing")).not.toThrow();
  });

  it("supports docker kind handle", () => {
    const handle: RuntimeHandle = {
      kind: "docker",
      stop: vi.fn().mockResolvedValue(undefined),
    };

    registerAttemptRuntime("attempt-docker", handle);
    const retrieved = getAttemptRuntime("attempt-docker");

    expect(retrieved?.kind).toBe("docker");
  });
});
