/** Factory Live Console (PR-102) - Display live logs from factory run */
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, Terminal } from "lucide-react";

export interface LogLine {
  ts: string;
  taskId: string;
  attemptId: string;
  line: string;
}

interface FactoryLiveConsoleProps {
  lines: LogLine[];
  maxLines?: number;
}

const TASK_COLORS = [
  "text-blue-400",
  "text-green-400",
  "text-yellow-400",
  "text-purple-400",
  "text-pink-400",
  "text-cyan-400",
];

function getTaskColor(taskId: string, colorMap: Map<string, string>): string {
  if (!colorMap.has(taskId)) {
    const idx = colorMap.size % TASK_COLORS.length;
    colorMap.set(taskId, TASK_COLORS[idx]);
  }
  return colorMap.get(taskId)!;
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
  } catch {
    return ts;
  }
}

export function FactoryLiveConsole({ lines, maxLines = 500 }: FactoryLiveConsoleProps) {
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const colorMap = useRef(new Map<string, string>()).current;

  // Auto-scroll to bottom when new lines arrive (unless paused)
  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, paused]);

  // Limit displayed lines
  const displayedLines = lines.slice(-maxLines);

  return (
    <div className="rounded-lg border bg-black/90 text-white" data-testid="factory-live-console">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Terminal className="h-4 w-4" />
          <span>Live Console</span>
          <span className="text-xs">({lines.length} lines)</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-gray-400 hover:text-white"
          onClick={() => setPaused(!paused)}
          data-testid="pause-scroll-button"
        >
          {paused ? (
            <>
              <Play className="h-3 w-3 mr-1" />
              Resume
            </>
          ) : (
            <>
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </>
          )}
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto font-mono text-xs p-3 space-y-0.5"
      >
        {displayedLines.length === 0 ? (
          <div className="text-gray-500 italic">Waiting for logs...</div>
        ) : (
          displayedLines.map((log, idx) => {
            const color = getTaskColor(log.taskId, colorMap);
            return (
              <div
                key={idx}
                className="flex gap-2"
                data-testid={`console-line-${idx}`}
              >
                <span className="text-gray-500 shrink-0">{formatTime(log.ts)}</span>
                <span className={`shrink-0 ${color}`}>[{log.taskId.slice(0, 8)}]</span>
                <span className="text-gray-200 break-all">{log.line}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
