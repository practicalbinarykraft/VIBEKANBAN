/**
 * Derived Autopilot Status Service Tests (PR-76)
 * TDD: Tests for computing autopilot status from database state
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDerivedAutopilotStatus } from "../derived-autopilot-status.service";

// Mock the database
vi.mock("@/server/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/server/db/schema", () => ({
  autopilotRuns: { id: "id", projectId: "project_id", status: "status", startedAt: "started_at" },
  attempts: { id: "id", autopilotRunId: "autopilot_run_id", status: "status" },
}));

import { db } from "@/server/db";

describe("getDerivedAutopilotStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns IDLE when no runs exist", async () => {
    // Mock: no runs found
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any);

    const result = await getDerivedAutopilotStatus("project-123");

    expect(result.status).toBe("IDLE");
    expect(result.runId).toBeNull();
    expect(result.activeAttempts).toBe(0);
    expect(result.failedAttempts).toBe(0);
    expect(result.completedAttempts).toBe(0);
  });

  it("returns RUNNING when run is running with active attempts", async () => {
    // Mock: running run found
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "run-1", projectId: "project-123", status: "running", startedAt: new Date() },
            ]),
          }),
        }),
      }),
    } as any);

    // Mock: attempts for this run (1 running, 1 queued)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "att-1", status: "running" },
          { id: "att-2", status: "queued" },
        ]),
      }),
    } as any);

    const result = await getDerivedAutopilotStatus("project-123");

    expect(result.status).toBe("RUNNING");
    expect(result.runId).toBe("run-1");
    expect(result.activeAttempts).toBe(2);
  });

  it("returns RUNNING when run is running with no attempts (transitional)", async () => {
    // Mock: running run found
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "run-1", projectId: "project-123", status: "running", startedAt: new Date() },
            ]),
          }),
        }),
      }),
    } as any);

    // Mock: no attempts yet
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    const result = await getDerivedAutopilotStatus("project-123");

    expect(result.status).toBe("RUNNING");
    expect(result.runId).toBe("run-1");
    expect(result.activeAttempts).toBe(0);
  });

  it("returns COMPLETED when run is completed with all attempts completed", async () => {
    // Mock: completed run found
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "run-1", projectId: "project-123", status: "completed", startedAt: new Date() },
            ]),
          }),
        }),
      }),
    } as any);

    // Mock: all attempts completed
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "att-1", status: "completed" },
          { id: "att-2", status: "completed" },
        ]),
      }),
    } as any);

    const result = await getDerivedAutopilotStatus("project-123");

    expect(result.status).toBe("COMPLETED");
    expect(result.runId).toBe("run-1");
    expect(result.completedAttempts).toBe(2);
    expect(result.failedAttempts).toBe(0);
  });

  it("returns FAILED when run is completed but has failed attempts", async () => {
    // Mock: completed run found
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "run-1", projectId: "project-123", status: "completed", startedAt: new Date() },
            ]),
          }),
        }),
      }),
    } as any);

    // Mock: one failed, one completed
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "att-1", status: "completed" },
          { id: "att-2", status: "failed" },
        ]),
      }),
    } as any);

    const result = await getDerivedAutopilotStatus("project-123");

    expect(result.status).toBe("FAILED");
    expect(result.runId).toBe("run-1");
    expect(result.completedAttempts).toBe(1);
    expect(result.failedAttempts).toBe(1);
  });

  it("returns FAILED when run status is failed", async () => {
    // Mock: failed run found
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "run-1", projectId: "project-123", status: "failed", startedAt: new Date() },
            ]),
          }),
        }),
      }),
    } as any);

    // Mock: attempts (not needed for failed run, but still fetched)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "att-1", status: "failed" },
        ]),
      }),
    } as any);

    const result = await getDerivedAutopilotStatus("project-123");

    expect(result.status).toBe("FAILED");
    expect(result.runId).toBe("run-1");
  });

  it("returns CANCELLED when run status is cancelled", async () => {
    // Mock: cancelled run found
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "run-1", projectId: "project-123", status: "cancelled", startedAt: new Date() },
            ]),
          }),
        }),
      }),
    } as any);

    // Mock: attempts
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "att-1", status: "stopped" },
        ]),
      }),
    } as any);

    const result = await getDerivedAutopilotStatus("project-123");

    expect(result.status).toBe("CANCELLED");
    expect(result.runId).toBe("run-1");
  });
});
