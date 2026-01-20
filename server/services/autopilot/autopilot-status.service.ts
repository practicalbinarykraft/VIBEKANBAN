/** Autopilot Status Service (PR-68) - Get project autopilot status */
import { db } from "@/server/db";
import { planningSessions } from "@/server/db/schema";
import { eq, desc, isNotNull } from "drizzle-orm";

export type AutopilotApiStatus = "idle" | "running" | "stopped" | "failed";

export interface AutopilotStatusResponse {
  enabled: boolean;
  status: AutopilotApiStatus;
  sessionId: string | null;
  currentTaskId: string | null;
  currentAttemptId: string | null;
  errorCode: string | null;
}

interface StoredAutopilotState {
  status: string;
  mode: string;
  taskQueue?: string[];
  currentTaskIndex?: number;
  completedTasks?: string[];
  currentAttemptId?: string;
  error?: string;
  stopReason?: string;
}

function mapStatusToApi(state: StoredAutopilotState | null): AutopilotApiStatus {
  if (!state) return "idle";

  switch (state.status) {
    case "RUNNING":
    case "WAITING_APPROVAL":
    case "PAUSED":
      return "running";
    case "FAILED":
      return "failed";
    case "DONE":
      return "idle";
    case "IDLE":
      // If has stopReason or was previously running, it's stopped
      if (state.stopReason || (state.taskQueue && state.taskQueue.length > 0 && state.mode !== "OFF")) {
        return "stopped";
      }
      return "idle";
    default:
      return "idle";
  }
}

export async function getProjectAutopilotStatus(projectId: string): Promise<AutopilotStatusResponse> {
  // Find most recent session with autopilot state for this project
  const session = await db
    .select({
      id: planningSessions.id,
      autopilotState: planningSessions.autopilotState,
    })
    .from(planningSessions)
    .where(eq(planningSessions.projectId, projectId))
    .orderBy(desc(planningSessions.updatedAt))
    .limit(1)
    .get();

  // No session or no autopilot state
  if (!session || !session.autopilotState) {
    return {
      enabled: true,
      status: "idle",
      sessionId: null,
      currentTaskId: null,
      currentAttemptId: null,
      errorCode: null,
    };
  }

  let state: StoredAutopilotState;
  try {
    state = JSON.parse(session.autopilotState);
  } catch {
    return {
      enabled: true,
      status: "idle",
      sessionId: null,
      currentTaskId: null,
      currentAttemptId: null,
      errorCode: null,
    };
  }

  const status = mapStatusToApi(state);
  const currentTaskId = state.taskQueue?.[state.currentTaskIndex ?? 0] ?? null;

  return {
    enabled: true,
    status,
    sessionId: session.id,
    currentTaskId,
    currentAttemptId: state.currentAttemptId ?? null,
    errorCode: status === "failed" ? "EXECUTION_ERROR" : null,
  };
}
