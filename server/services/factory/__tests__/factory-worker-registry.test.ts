/** Factory Worker Registry Tests (PR-86) - TDD */
import { describe, it, expect, beforeEach } from "vitest";
import {
  FactoryWorkerRegistry,
  createWorkerHandle,
  type FactoryWorkerHandle,
} from "../factory-worker-registry";

describe("FactoryWorkerRegistry", () => {
  let registry: FactoryWorkerRegistry;

  beforeEach(() => {
    registry = new FactoryWorkerRegistry();
  });

  describe("set/get", () => {
    it("stores and retrieves handle by projectId", () => {
      const handle = createWorkerHandle("project-1", "run-1");
      registry.set(handle);
      expect(registry.get("project-1")).toBe(handle);
    });

    it("returns null for unknown projectId", () => {
      expect(registry.get("unknown")).toBeNull();
    });
  });

  describe("delete", () => {
    it("removes handle from registry", () => {
      const handle = createWorkerHandle("project-1", "run-1");
      registry.set(handle);
      registry.delete("project-1");
      expect(registry.get("project-1")).toBeNull();
    });

    it("does nothing for unknown projectId", () => {
      expect(() => registry.delete("unknown")).not.toThrow();
    });
  });

  describe("list", () => {
    it("returns all handles", () => {
      const h1 = createWorkerHandle("p1", "r1");
      const h2 = createWorkerHandle("p2", "r2");
      registry.set(h1);
      registry.set(h2);
      const handles = registry.list();
      expect(handles).toHaveLength(2);
      expect(handles).toContain(h1);
      expect(handles).toContain(h2);
    });

    it("returns empty array when no handles", () => {
      expect(registry.list()).toHaveLength(0);
    });
  });

  describe("has", () => {
    it("returns true when handle exists", () => {
      registry.set(createWorkerHandle("p1", "r1"));
      expect(registry.has("p1")).toBe(true);
    });

    it("returns false when handle does not exist", () => {
      expect(registry.has("p1")).toBe(false);
    });
  });
});

describe("createWorkerHandle", () => {
  it("creates handle with correct projectId and runId", () => {
    const handle = createWorkerHandle("project-1", "run-1");
    expect(handle.projectId).toBe("project-1");
    expect(handle.runId).toBe("run-1");
  });

  it("initializes stopRequested as false", () => {
    const handle = createWorkerHandle("project-1", "run-1");
    expect(handle.stopRequested).toBe(false);
  });

  it("requestStop sets stopRequested to true", () => {
    const handle = createWorkerHandle("project-1", "run-1");
    handle.requestStop();
    expect(handle.stopRequested).toBe(true);
  });

  it("requestStop is idempotent", () => {
    const handle = createWorkerHandle("project-1", "run-1");
    handle.requestStop();
    handle.requestStop();
    expect(handle.stopRequested).toBe(true);
  });
});
