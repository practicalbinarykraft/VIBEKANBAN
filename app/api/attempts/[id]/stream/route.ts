import { NextRequest } from "next/server";
import { eventsHub, AttemptLogEvent, AttemptStatusEvent, PRStatusEvent } from "@/server/services/events-hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attemptId } = await params;

  const encoder = new TextEncoder();

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const connectMsg = `data: ${JSON.stringify({ type: "connected", attemptId })}\n\n`;
      controller.enqueue(encoder.encode(connectMsg));

      // Log event handler
      const handleLog = (event: AttemptLogEvent) => {
        if (event.attemptId === attemptId) {
          const msg = `event: log\ndata: ${JSON.stringify({
            timestamp: event.timestamp,
            level: event.level,
            message: event.message,
          })}\n\n`;
          controller.enqueue(encoder.encode(msg));
        }
      };

      // Status event handler
      const handleStatus = (event: AttemptStatusEvent) => {
        if (event.attemptId === attemptId) {
          const msg = `event: status\ndata: ${JSON.stringify({
            status: event.status,
            exitCode: event.exitCode,
          })}\n\n`;
          controller.enqueue(encoder.encode(msg));
        }
      };

      // PR status event handler
      const handlePRStatus = (event: PRStatusEvent) => {
        if (event.attemptId === attemptId) {
          const msg = `event: pr-status\ndata: ${JSON.stringify({
            prStatus: event.prStatus,
          })}\n\n`;
          controller.enqueue(encoder.encode(msg));
        }
      };

      // Subscribe to events
      eventsHub.on("attempt:log", handleLog);
      eventsHub.on("attempt:status", handleStatus);
      eventsHub.on("pr:status", handlePRStatus);

      // Ping to keep connection alive
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch (error) {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        eventsHub.off("attempt:log", handleLog);
        eventsHub.off("attempt:status", handleStatus);
        eventsHub.off("pr:status", handlePRStatus);
        clearInterval(pingInterval);
        try {
          controller.close();
        } catch (error) {
          // Stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
