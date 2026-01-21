/** GET /api/projects/[id]/factory/runs/[runId]/stream (PR-102) - SSE log stream */
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { logs, attempts } from "@/server/db/schema";
import { eq, inArray, desc } from "drizzle-orm";

interface LogEvent {
  ts: string;
  taskId: string;
  attemptId: string;
  line: string;
}

async function getRunAttemptIds(runId: string): Promise<string[]> {
  const rows = await db.select({ id: attempts.id })
    .from(attempts)
    .where(eq(attempts.factoryRunId, runId));
  return rows.map((r) => r.id);
}

async function getRecentLogs(attemptIds: string[]): Promise<LogEvent[]> {
  if (attemptIds.length === 0) return [];

  const rows = await db.select({
    id: logs.id,
    attemptId: logs.attemptId,
    timestamp: logs.timestamp,
    message: logs.message,
  })
    .from(logs)
    .where(inArray(logs.attemptId, attemptIds))
    .orderBy(desc(logs.timestamp))
    .limit(100);

  const attemptToTask = new Map<string, string>();
  const attemptRows = await db.select({ id: attempts.id, taskId: attempts.taskId })
    .from(attempts)
    .where(inArray(attempts.id, attemptIds));
  attemptRows.forEach((a) => attemptToTask.set(a.id, a.taskId));

  return rows.reverse().map((r) => ({
    ts: r.timestamp.toISOString(),
    taskId: attemptToTask.get(r.attemptId) || "unknown",
    attemptId: r.attemptId,
    line: r.message,
  }));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const { runId } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const attemptIds = await getRunAttemptIds(runId);

      const initialLogs = await getRecentLogs(attemptIds);
      for (const log of initialLogs) {
        const data = JSON.stringify(log);
        controller.enqueue(encoder.encode("event: log\ndata: " + data + "\n\n"));
      }

      const interval = setInterval(async () => {
        try {
          const newLogs = await getRecentLogs(attemptIds);
          for (const log of newLogs.slice(-10)) {
            const data = JSON.stringify(log);
            controller.enqueue(encoder.encode("event: log\ndata: " + data + "\n\n"));
          }
        } catch {
          // Ignore poll errors
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 5 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
