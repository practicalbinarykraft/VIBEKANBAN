/**
 * In-memory planning sessions storage (mock)
 *
 * Stores session data including ideaText, status, and productResult
 * Used by /planning/start, /planning/finish, and /planning/apply endpoints
 */

export type SessionStatus = "DISCUSSION" | "RESULT_READY";

export interface PlanStep {
  title: string;
  tasks: string[];
}

export interface ProductResult {
  mode: "QUESTIONS" | "PLAN";
  questions?: string[];
  steps?: PlanStep[];
}

export interface PlanningSession {
  ideaText: string;
  status: SessionStatus;
  productResult?: ProductResult;
}

const sessions = new Map<string, PlanningSession>();

export function storeSession(sessionId: string, ideaText: string): void {
  sessions.set(sessionId, {
    ideaText,
    status: "DISCUSSION",
  });
}

export function getSession(sessionId: string): PlanningSession | undefined {
  return sessions.get(sessionId);
}

export function updateSessionResult(
  sessionId: string,
  productResult: ProductResult
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  session.productResult = productResult;
  // Only set RESULT_READY if we have a PLAN (with steps to apply)
  session.status = productResult.mode === "PLAN" ? "RESULT_READY" : "DISCUSSION";
  return true;
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

// For backwards compatibility - returns just ideaText
export function getSessionIdeaText(sessionId: string): string | undefined {
  return sessions.get(sessionId)?.ideaText;
}
