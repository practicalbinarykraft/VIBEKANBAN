import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFactoryReadiness } from "../useFactoryReadiness";

describe("useFactoryReadiness", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns loading state initially", () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as any;
    const { result } = renderHook(() => useFactoryReadiness("test-project"));
    expect(result.current.loading).toBe(true);
    expect(result.current.checks).toEqual([]);
  });

  it("returns allPassed=true when all checks pass", async () => {
    global.fetch = vi.fn((url: string) => {
      if (url.includes("/api/ai/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ realAiEligible: true, provider: "anthropic" }),
        });
      }
      if (url.includes("/api/projects/test-project/tasks")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ status: "todo" }]),
        });
      }
      if (url.includes("/api/projects/test-project")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ repoPath: "/path/to/repo" }),
        });
      }
      return Promise.resolve({ ok: false });
    }) as any;

    const { result } = renderHook(() => useFactoryReadiness("test-project"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allPassed).toBe(true);
    expect(result.current.checks.every((c) => c.passed)).toBe(true);
  });

  it("returns allPassed=false when AI is not eligible", async () => {
    global.fetch = vi.fn((url: string) => {
      if (url.includes("/api/ai/status")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              realAiEligible: false,
              provider: "db",
              reason: "MISSING_API_KEY",
            }),
        });
      }
      if (url.includes("/api/projects/test-project/tasks")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ status: "todo" }]),
        });
      }
      if (url.includes("/api/projects/test-project")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ repoPath: "/path/to/repo" }),
        });
      }
      return Promise.resolve({ ok: false });
    }) as any;

    const { result } = renderHook(() => useFactoryReadiness("test-project"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allPassed).toBe(false);
    const aiCheck = result.current.checks.find((c) => c.id === "ai-enabled");
    expect(aiCheck?.passed).toBe(false);
    expect(aiCheck?.fixUrl).toContain("/settings");
  });

  it("returns allPassed=false when no tasks", async () => {
    global.fetch = vi.fn((url: string) => {
      if (url.includes("/api/ai/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ realAiEligible: true, provider: "anthropic" }),
        });
      }
      if (url.includes("/api/projects/test-project/tasks")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]), // No tasks
        });
      }
      if (url.includes("/api/projects/test-project")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ repoPath: "/path/to/repo" }),
        });
      }
      return Promise.resolve({ ok: false });
    }) as any;

    const { result } = renderHook(() => useFactoryReadiness("test-project"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allPassed).toBe(false);
    const tasksCheck = result.current.checks.find((c) => c.id === "has-tasks");
    expect(tasksCheck?.passed).toBe(false);
  });

  it("provides fix URLs for failed checks", async () => {
    global.fetch = vi.fn((url: string) => {
      if (url.includes("/api/ai/status")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ realAiEligible: false, provider: "db", reason: "MISSING_API_KEY" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    }) as any;

    const { result } = renderHook(() => useFactoryReadiness("test-project"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const failedChecks = result.current.checks.filter((c) => !c.passed);
    expect(failedChecks.length).toBeGreaterThan(0);
    expect(failedChecks.every((c) => c.fixUrl)).toBe(true);
  });
});
