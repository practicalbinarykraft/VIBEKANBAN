/**
 * Planning Session Store (DB-backed)
 *
 * Persists planning sessions to SQLite for idempotency across server restarts.
 * ≤200 LOC, single responsibility: session CRUD + idempotency.
 */

import { db } from '@/server/db';
import { planningSessions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export type PlanningSessionStatus = 'DISCUSSION' | 'RESULT_READY' | 'APPLIED';

export interface ProductResult {
  mode: 'QUESTIONS' | 'PLAN';
  questions?: string[];
  steps?: { title: string; tasks: string[] }[];
  planSteps?: string[];  // Raw step titles from backlog generator
}

export interface PlanningSession {
  id: string;
  projectId: string;
  ideaText: string;
  status: PlanningSessionStatus;
  productResult?: ProductResult;
  appliedTaskIds?: string[];
}

/**
 * Create a new planning session
 */
export async function createSession(
  projectId: string,
  ideaText: string
): Promise<string> {
  const sessionId = randomUUID();

  await db.insert(planningSessions).values({
    id: sessionId,
    projectId,
    ideaText,
    status: 'DISCUSSION',
  });

  return sessionId;
}

/**
 * Get session by ID
 */
export async function getSession(
  sessionId: string
): Promise<PlanningSession | undefined> {
  const rows = await db
    .select()
    .from(planningSessions)
    .where(eq(planningSessions.id, sessionId))
    .limit(1);

  if (rows.length === 0) return undefined;

  const row = rows[0];
  return {
    id: row.id,
    projectId: row.projectId || '',
    ideaText: row.ideaText,
    status: row.status as PlanningSessionStatus,
    productResult: row.productResult ? JSON.parse(row.productResult) : undefined,
    appliedTaskIds: row.appliedTaskIds ? JSON.parse(row.appliedTaskIds) : undefined,
  };
}

/**
 * Update session with product result (questions or plan)
 */
export async function updateSessionResult(
  sessionId: string,
  productResult: ProductResult
): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;

  const newStatus: PlanningSessionStatus =
    productResult.mode === 'PLAN' ? 'RESULT_READY' : 'DISCUSSION';

  await db
    .update(planningSessions)
    .set({
      productResult: JSON.stringify(productResult),
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(planningSessions.id, sessionId));

  return true;
}

/**
 * Mark session as applied with task IDs (idempotent)
 * If already applied, returns true but does not modify data.
 */
export async function markSessionApplied(
  sessionId: string,
  taskIds: string[]
): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;

  // Idempotent: if already applied, do nothing
  if (session.status === 'APPLIED') return true;

  await db
    .update(planningSessions)
    .set({
      status: 'APPLIED',
      appliedTaskIds: JSON.stringify(taskIds),
      updatedAt: new Date(),
    })
    .where(eq(planningSessions.id, sessionId));

  return true;
}

/**
 * Check if session was already applied
 */
export async function isSessionApplied(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId);
  return session?.status === 'APPLIED';
}

/**
 * Get task IDs created when session was applied
 */
export async function getAppliedTaskIds(
  sessionId: string
): Promise<string[] | undefined> {
  const session = await getSession(sessionId);
  return session?.appliedTaskIds;
}

/**
 * Save user answers to clarifying questions and mark question phase complete
 */
export async function updateSessionAnswers(
  sessionId: string,
  answers: Record<string, string>
): Promise<boolean> {
  const rows = await db
    .select()
    .from(planningSessions)
    .where(eq(planningSessions.id, sessionId))
    .limit(1);

  if (rows.length === 0) return false;

  await db
    .update(planningSessions)
    .set({
      userAnswers: JSON.stringify(answers),
      questionPhaseComplete: 1,
      updatedAt: new Date(),
    })
    .where(eq(planningSessions.id, sessionId));

  return true;
}
