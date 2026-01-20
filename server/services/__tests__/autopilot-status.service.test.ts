/** Autopilot Status Service Tests (PR-68) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProjectAutopilotStatus } from "../autopilot/autopilot-status.service";

const mockGet = vi.fn();

// Mock the db module with proper chain
vi.mock("@/server/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: mockGet,
            })),
          })),
        })),
      })),
    })),
  },
}));

// Mock the schema
vi.mock("@/server/db/schema", () => ({
  planningSessions: {
    id: "id",
    projectId: "project_id",
    autopilotState: "autopilot_state",
    updatedAt: "updated_at",
  },
}));

describe("AutopilotStatusService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProjectAutopilotStatus", () => {
    it("returns idle when no session exists", async () => {
      mockGet.mockResolvedValue(undefined);

      const result = await getProjectAutopilotStatus("project-1");

      expect(result.status).toBe("idle");
      expect(result.sessionId).toBeNull();
      expect(result.enabled).toBe(true);
    });

    it("returns idle when session has no autopilot state", async () => {
      mockGet.mockResolvedValue({ id: "session-1", autopilotState: null });

      const result = await getProjectAutopilotStatus("project-1");

      expect(result.status).toBe("idle");
      expect(result.sessionId).toBeNull();
    });

    it("returns running when session has RUNNING status", async () => {
      const autopilotState = JSON.stringify({
        status: "RUNNING",
        mode: "AUTO",
        taskQueue: ["task-1", "task-2"],
        currentTaskIndex: 0,
        completedTasks: [],
      });

      mockGet.mockResolvedValue({ id: "session-1", autopilotState });

      const result = await getProjectAutopilotStatus("project-1");

      expect(result.status).toBe("running");
      expect(result.sessionId).toBe("session-1");
      expect(result.currentTaskId).toBe("task-1");
    });

    it("returns stopped when session has IDLE status with stopReason", async () => {
      const autopilotState = JSON.stringify({
        status: "IDLE",
        mode: "OFF",
        taskQueue: ["task-1"],
        currentTaskIndex: 0,
        completedTasks: [],
        stopReason: "user_requested",
      });

      mockGet.mockResolvedValue({ id: "session-1", autopilotState });

      const result = await getProjectAutopilotStatus("project-1");

      expect(result.status).toBe("stopped");
      expect(result.sessionId).toBe("session-1");
    });

    it("returns failed when session has FAILED status", async () => {
      const autopilotState = JSON.stringify({
        status: "FAILED",
        mode: "AUTO",
        taskQueue: ["task-1"],
        currentTaskIndex: 0,
        completedTasks: [],
        error: "Task execution failed",
      });

      mockGet.mockResolvedValue({ id: "session-1", autopilotState });

      const result = await getProjectAutopilotStatus("project-1");

      expect(result.status).toBe("failed");
      expect(result.errorCode).toBe("EXECUTION_ERROR");
    });

    it("returns correct currentAttemptId when present", async () => {
      const autopilotState = JSON.stringify({
        status: "RUNNING",
        mode: "AUTO",
        taskQueue: ["task-1"],
        currentTaskIndex: 0,
        completedTasks: [],
        currentAttemptId: "attempt-123",
      });

      mockGet.mockResolvedValue({ id: "session-1", autopilotState });

      const result = await getProjectAutopilotStatus("project-1");

      expect(result.currentAttemptId).toBe("attempt-123");
    });
  });
});
