/** Autopilot Readiness Service Tests (PR-81) */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies BEFORE importing the service
vi.mock("@/server/db", () => ({
  db: { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis() },
}));
vi.mock("@/server/db/schema", () => ({
  tasks: { id: "id", projectId: "project_id", status: "status" },
  projects: { id: "id", repoPath: "repo_path" },
}));
vi.mock("../derived-autopilot-status.service", () => ({
  getDerivedAutopilotStatus: vi.fn(),
}));
vi.mock("@/server/services/ai/ai-status", () => ({
  getAiStatus: vi.fn(),
}));
vi.mock("@/lib/autopilot-safety", () => ({
  checkRepoReady: vi.fn(),
}));

import { getAutopilotReadiness } from "../autopilot-readiness.service";
import { db } from "@/server/db";
import { getDerivedAutopilotStatus } from "../derived-autopilot-status.service";
import { getAiStatus } from "@/server/services/ai/ai-status";
import { checkRepoReady } from "@/lib/autopilot-safety";

describe("getAutopilotReadiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks: all checks pass
    vi.mocked(getDerivedAutopilotStatus).mockResolvedValue({
      status: "IDLE", runId: null, activeAttempts: 0, failedAttempts: 0, completedAttempts: 0,
    });
    vi.mocked(getAiStatus).mockResolvedValue({
      realAiEligible: true, provider: "anthropic", model: "claude",
      mode: "real", configuredProviders: [], testModeTriggers: [],
    });
    vi.mocked(checkRepoReady).mockResolvedValue({ ok: true });
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: "task-1", status: "todo" }]),
      }),
    } as any);
  });

  it("returns ready=true when all checks pass", async () => {
    const result = await getAutopilotReadiness("project-1");
    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it("returns NO_TASKS blocker when no tasks ready", async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    } as any);
    const result = await getAutopilotReadiness("project-1");
    expect(result.ready).toBe(false);
    expect(result.blockers).toContainEqual({ type: "NO_TASKS" });
  });

  it("returns AI_NOT_CONFIGURED blocker when AI not configured", async () => {
    vi.mocked(getAiStatus).mockResolvedValue({
      realAiEligible: false, provider: "db", model: "db", reason: "MISSING_API_KEY",
      mode: "mock", configuredProviders: [], testModeTriggers: [],
    });
    const result = await getAutopilotReadiness("project-1");
    expect(result.ready).toBe(false);
    expect(result.blockers).toContainEqual({ type: "AI_NOT_CONFIGURED" });
  });

  it("returns BUDGET_EXCEEDED blocker with amounts", async () => {
    vi.mocked(getAiStatus).mockResolvedValue({
      realAiEligible: false, provider: "db", model: "db", reason: "BUDGET_LIMIT_EXCEEDED",
      limitUSD: 100, spendUSD: 120, mode: "mock", configuredProviders: [], testModeTriggers: [],
    });
    const result = await getAutopilotReadiness("project-1");
    expect(result.ready).toBe(false);
    expect(result.blockers).toContainEqual({ type: "BUDGET_EXCEEDED", limitUSD: 100, spendUSD: 120 });
  });

  it("returns AUTOPILOT_RUNNING blocker when running", async () => {
    vi.mocked(getDerivedAutopilotStatus).mockResolvedValue({
      status: "RUNNING", runId: "run-1", activeAttempts: 1, failedAttempts: 0, completedAttempts: 0,
    });
    const result = await getAutopilotReadiness("project-1");
    expect(result.ready).toBe(false);
    expect(result.blockers).toContainEqual({ type: "AUTOPILOT_RUNNING" });
  });

  it("returns REPO_NOT_READY blocker when repo not ready", async () => {
    vi.mocked(checkRepoReady).mockResolvedValue({ ok: false, code: "REPO_NOT_READY", reason: "Not cloned" });
    const result = await getAutopilotReadiness("project-1");
    expect(result.ready).toBe(false);
    expect(result.blockers).toContainEqual({ type: "REPO_NOT_READY" });
  });

  it("returns multiple blockers when multiple issues", async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    } as any);
    vi.mocked(getAiStatus).mockResolvedValue({
      realAiEligible: false, provider: "db", model: "db", reason: "MISSING_API_KEY",
      mode: "mock", configuredProviders: [], testModeTriggers: [],
    });
    const result = await getAutopilotReadiness("project-1");
    expect(result.ready).toBe(false);
    expect(result.blockers.length).toBeGreaterThanOrEqual(2);
    expect(result.blockers).toContainEqual({ type: "NO_TASKS" });
    expect(result.blockers).toContainEqual({ type: "AI_NOT_CONFIGURED" });
  });
});
