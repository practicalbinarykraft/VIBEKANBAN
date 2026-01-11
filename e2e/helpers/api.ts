import { APIRequestContext } from '@playwright/test';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  projectId: string;
}

interface Attempt {
  id: string;
  taskId: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
}

export async function createTask(
  request: APIRequestContext,
  projectId: string,
  title: string,
  description: string
): Promise<Task> {
  const response = await request.post(`http://localhost:8000/api/projects/${projectId}/tasks`, {
    data: {
      title,
      description,
      status: 'todo',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create task: ${response.status()} ${await response.text()}`);
  }

  return await response.json();
}

export async function runTask(
  request: APIRequestContext,
  taskId: string
): Promise<{ attemptId: string }> {
  const response = await request.post(`http://localhost:8000/api/tasks/${taskId}/run`);

  if (!response.ok()) {
    throw new Error(`Failed to run task: ${response.status()} ${await response.text()}`);
  }

  return await response.json();
}

export async function getLatestAttempt(
  request: APIRequestContext,
  taskId: string
): Promise<Attempt | null> {
  const response = await request.get(`http://localhost:8000/api/tasks/${taskId}/attempts`);

  if (!response.ok()) {
    throw new Error(`Failed to get attempts: ${response.status()}`);
  }

  const attempts = await response.json();
  return attempts.length > 0 ? attempts[0] : null;
}

export async function waitForAttemptCompletion(
  request: APIRequestContext,
  taskId: string,
  timeoutMs: number = 30000
): Promise<Attempt> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const attempt = await getLatestAttempt(request, taskId);

    if (!attempt) {
      throw new Error('No attempt found');
    }

    if (attempt.status === 'completed' || attempt.status === 'failed') {
      return attempt;
    }

    // Wait 500ms before polling again
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`Attempt did not complete within ${timeoutMs}ms`);
}

export async function deleteTask(
  request: APIRequestContext,
  taskId: string
): Promise<void> {
  const response = await request.delete(`http://localhost:8000/api/tasks/${taskId}`);

  if (!response.ok()) {
    throw new Error(`Failed to delete task: ${response.status()}`);
  }
}

/**
 * Creates a test fixture attempt with logs and artifacts (no Docker needed)
 *
 * @param request - Playwright API request context
 * @param taskId - Task ID to create attempt for
 * @param status - Attempt status (default: 'completed')
 * @param options - Additional options for fixture creation
 * @returns Created attempt ID
 */
export async function createFixtureAttempt(
  request: APIRequestContext,
  taskId: string,
  status: 'completed' | 'failed' = 'completed',
  options?: {
    withApplyError?: boolean;
    applyErrorMessage?: string;
    noDiff?: boolean;
    withPR?: boolean;
    prStatus?: 'open' | 'merged' | 'closed';
    withConflict?: boolean;
    conflictFiles?: string[];
    forceStatus?: 'running' | 'queued' | 'stopped';
  }
): Promise<string> {
  const response = await request.post('http://localhost:8000/api/test/fixtures/create-attempt', {
    data: {
      taskId,
      status,
      withArtifacts: !options?.noDiff,
      withLogs: true,
      withApplyError: options?.withApplyError || false,
      applyErrorMessage: options?.applyErrorMessage,
      noDiff: options?.noDiff || false,
      withPR: options?.withPR || false,
      prStatus: options?.prStatus || 'open',
      withConflict: options?.withConflict || false,
      conflictFiles: options?.conflictFiles,
      forceStatus: options?.forceStatus,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create fixture attempt: ${response.status()} ${await response.text()}`);
  }

  const data = await response.json();
  return data.attemptId;
}

/**
 * Clear processed webhooks table for fresh test state
 * Ensures webhook idempotency tests start clean
 */
export async function clearProcessedWebhooks(
  request: APIRequestContext
): Promise<void> {
  const response = await request.delete('http://localhost:8000/api/test/webhooks/clear');

  if (!response.ok()) {
    throw new Error(`Failed to clear processed webhooks: ${response.status()} ${await response.text()}`);
  }
}
