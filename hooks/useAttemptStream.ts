import { useState, useEffect, useRef } from "react";
import { LogEntry } from "@/types";

interface AttemptStreamState {
  logs: LogEntry[];
  status: "pending" | "running" | "completed" | "failed" | "stopped" | null;
  exitCode: number | null;
  prStatus: "open" | "merged" | "closed" | null;
  connectionStatus: "connecting" | "connected" | "disconnected" | "reconnecting";
}

export function useAttemptStream(attemptId: string | null) {
  const [state, setState] = useState<AttemptStreamState>({
    logs: [],
    status: null,
    exitCode: null,
    prStatus: null,
    connectionStatus: "disconnected",
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!attemptId) {
      setState({
        logs: [],
        status: null,
        exitCode: null,
        prStatus: null,
        connectionStatus: "disconnected",
      });
      return;
    }

    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      setState((prev) => ({ ...prev, connectionStatus: "connecting" }));

      const es = new EventSource(`/api/attempts/${attemptId}/stream`);
      eventSourceRef.current = es;

      es.addEventListener("open", () => {
        if (!isMounted) return;
        setState((prev) => ({ ...prev, connectionStatus: "connected" }));
      });

      es.addEventListener("log", (event) => {
        if (!isMounted) return;
        const data = JSON.parse(event.data);
        setState((prev) => ({
          ...prev,
          logs: [
            ...prev.logs,
            {
              timestamp: new Date(data.timestamp),
              level: data.level,
              message: data.message,
            },
          ],
        }));
      });

      es.addEventListener("status", (event) => {
        if (!isMounted) return;
        const data = JSON.parse(event.data);
        setState((prev) => ({
          ...prev,
          status: data.status,
          exitCode: data.exitCode ?? prev.exitCode,
        }));
      });

      es.addEventListener("pr-status", (event) => {
        if (!isMounted) return;
        const data = JSON.parse(event.data);
        setState((prev) => ({
          ...prev,
          prStatus: data.prStatus,
        }));
      });

      es.addEventListener("error", () => {
        if (!isMounted) return;
        es.close();
        eventSourceRef.current = null;
        setState((prev) => ({ ...prev, connectionStatus: "reconnecting" }));

        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMounted) {
            connect();
          }
        }, 3000);
      });
    };

    connect();

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [attemptId]);

  return state;
}
