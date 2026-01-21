/** attempt-summary.service tests (PR-90) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAttemptSummary,
  type AttemptSummaryDeps,
  type AttemptSummaryResponse,
} from "../attempts/attempt-summary.service";

function createMockDeps(overrides: Partial<AttemptSummaryDeps> = {}): AttemptSummaryDeps {
  return {
    getAttempt: vi.fn().mockResolvedValue(null),
    getLastLog: vi.fn().mockResolvedValue(null),
    getErrorArtifact: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("getAttemptSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when attempt not found", async () => {
    const deps = createMockDeps({ getAttempt: vi.fn().mockResolvedValue(null) });
    const result = await getAttemptSummary("not-found", deps);
    expect(result).toBeNull();
  });

  it("returns null fields when no logs/artifacts", async () => {
    const deps = createMockDeps({
      getAttempt: vi.fn().mockResolvedValue({
        id: "a1",
        status: "completed",
        finishedAt: new Date("2026-01-20T12:00:00Z"),
      }),
      getLastLog: vi.fn().mockResolvedValue(null),
      getErrorArtifact: vi.fn().mockResolvedValue(null),
    });

    const result = await getAttemptSummary("a1", deps);

    expect(result).toEqual({
      attemptId: "a1",
      status: "completed",
      lastLogLine: null,
      errorMessage: null,
      updatedAt: "2026-01-20T12:00:00.000Z",
    });
  });

  it("returns lastLogLine trimmed to 200 chars", async () => {
    const longMessage = "x".repeat(300);
    const deps = createMockDeps({
      getAttempt: vi.fn().mockResolvedValue({
        id: "a1",
        status: "running",
        startedAt: new Date("2026-01-20T11:00:00Z"),
      }),
      getLastLog: vi.fn().mockResolvedValue({ message: longMessage }),
      getErrorArtifact: vi.fn().mockResolvedValue(null),
    });

    const result = await getAttemptSummary("a1", deps);

    expect(result?.lastLogLine).toHaveLength(200);
    expect(result?.lastLogLine).toBe("x".repeat(200));
  });

  it("picks error artifact message when present", async () => {
    const deps = createMockDeps({
      getAttempt: vi.fn().mockResolvedValue({
        id: "a1",
        status: "failed",
        finishedAt: new Date("2026-01-20T12:00:00Z"),
      }),
      getLastLog: vi.fn().mockResolvedValue({ message: "Some log" }),
      getErrorArtifact: vi.fn().mockResolvedValue({ content: "Connection refused" }),
    });

    const result = await getAttemptSummary("a1", deps);

    expect(result?.errorMessage).toBe("Connection refused");
    expect(result?.lastLogLine).toBe("Some log");
  });

  it("status + updatedAt passthrough", async () => {
    const deps = createMockDeps({
      getAttempt: vi.fn().mockResolvedValue({
        id: "a1",
        status: "queued",
        queuedAt: new Date("2026-01-20T10:00:00Z"),
      }),
    });

    const result = await getAttemptSummary("a1", deps);

    expect(result?.status).toBe("queued");
    expect(result?.updatedAt).toBe("2026-01-20T10:00:00.000Z");
  });

  it("uses startedAt when finishedAt is null", async () => {
    const deps = createMockDeps({
      getAttempt: vi.fn().mockResolvedValue({
        id: "a1",
        status: "running",
        startedAt: new Date("2026-01-20T11:30:00Z"),
        finishedAt: null,
      }),
    });

    const result = await getAttemptSummary("a1", deps);

    expect(result?.updatedAt).toBe("2026-01-20T11:30:00.000Z");
  });

  it("trims errorMessage to 200 chars", async () => {
    const longError = "e".repeat(300);
    const deps = createMockDeps({
      getAttempt: vi.fn().mockResolvedValue({
        id: "a1",
        status: "failed",
        finishedAt: new Date("2026-01-20T12:00:00Z"),
      }),
      getErrorArtifact: vi.fn().mockResolvedValue({ content: longError }),
    });

    const result = await getAttemptSummary("a1", deps);

    expect(result?.errorMessage).toHaveLength(200);
  });
});
