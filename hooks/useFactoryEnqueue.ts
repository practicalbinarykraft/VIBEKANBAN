/** useFactoryEnqueue Hook (PR-106) - Auto-enqueue task to factory */
"use client";

import { useState, useCallback, useRef } from "react";

export type EnqueueResult =
  | { ok: true; runId: string; enqueued: boolean }
  | { ok: false; error: string };

export interface UseFactoryEnqueueOptions {
  projectId: string;
  onEnqueue?: (result: EnqueueResult) => void;
}

export interface UseFactoryEnqueueReturn {
  enqueueTask: (taskId: string) => void;
  lastResult: EnqueueResult | null;
}

export function useFactoryEnqueue({
  projectId,
  onEnqueue,
}: UseFactoryEnqueueOptions): UseFactoryEnqueueReturn {
  const [lastResult, setLastResult] = useState<EnqueueResult | null>(null);
  const onEnqueueRef = useRef(onEnqueue);
  onEnqueueRef.current = onEnqueue;

  const enqueueTask = useCallback(
    (taskId: string) => {
      // Fire-and-forget: do not await
      fetch(`/api/projects/${projectId}/factory/enqueue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      })
        .then(async (response) => {
          const data = await response.json();
          let result: EnqueueResult;

          if (response.ok) {
            result = { ok: true, runId: data.runId, enqueued: data.enqueued };
          } else {
            result = { ok: false, error: data.error || "Unknown error" };
          }

          setLastResult(result);
          onEnqueueRef.current?.(result);
        })
        .catch((err) => {
          const result: EnqueueResult = {
            ok: false,
            error: err instanceof Error ? err.message : "Unknown error",
          };
          setLastResult(result);
          onEnqueueRef.current?.(result);
        });
    },
    [projectId]
  );

  return {
    enqueueTask,
    lastResult,
  };
}
