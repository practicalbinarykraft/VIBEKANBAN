/** GET /api/projects/[id]/factory/stream (PR-84) - SSE events for factory console */
import { NextRequest } from "next/server";
import { getFactorySnapshot, diffSnapshots, FactorySnapshot, FactoryEvent } from "@/server/services/factory/factory-events.service";

const POLL_INTERVAL_MS = 1500;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const encoder = new TextEncoder();
  let prevSnapshot: FactorySnapshot | null = null;
  let aborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: FactoryEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      const sendInitial = async () => {
        const snapshot = await getFactorySnapshot(projectId);
        if (snapshot) {
          sendEvent({ type: "run", runId: snapshot.runId, status: snapshot.runStatus });
          sendEvent({ type: "summary", counts: snapshot.counts });
          for (const att of snapshot.attempts) {
            sendEvent({ type: "attempt", attemptId: att.id, taskId: att.taskId, status: att.status });
            if (att.lastLogLine) sendEvent({ type: "log", attemptId: att.id, line: att.lastLogLine });
          }
        }
        return snapshot;
      };

      prevSnapshot = await sendInitial();

      const poll = async () => {
        if (aborted) return;
        try {
          const nextSnapshot = await getFactorySnapshot(projectId);
          if (nextSnapshot && prevSnapshot) {
            const events = diffSnapshots(prevSnapshot, nextSnapshot);
            for (const event of events) sendEvent(event);
          } else if (nextSnapshot && !prevSnapshot) {
            prevSnapshot = await sendInitial();
            return;
          }
          prevSnapshot = nextSnapshot;
        } catch { /* ignore errors during polling */ }
        if (!aborted) setTimeout(poll, POLL_INTERVAL_MS);
      };

      setTimeout(poll, POLL_INTERVAL_MS);
    },
    cancel() { aborted = true; },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
