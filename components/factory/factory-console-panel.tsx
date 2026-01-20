/** FactoryConsolePanel (PR-84) - Live console showing factory attempts */
"use client";

import { Button } from "@/components/ui/button";
import { Square, Terminal, Wifi, WifiOff } from "lucide-react";
import type { AttemptState } from "@/hooks/useFactoryStream";

interface FactoryConsolePanelProps {
  isConnected: boolean;
  runId: string | null;
  runStatus: string | null;
  attempts: Map<string, AttemptState>;
  counts: { total: number; completed: number; failed: number; cancelled: number; running: number; queued: number } | null;
  onStop: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  running: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  stopped: "bg-amber-500",
  queued: "bg-gray-400",
  pending: "bg-gray-400",
};

export function FactoryConsolePanel({
  isConnected, runId, runStatus, attempts, counts, onStop,
}: FactoryConsolePanelProps) {
  const isRunning = runStatus === "running";
  const attemptList = Array.from(attempts.values());

  return (
    <div className="rounded-lg border bg-card p-4" data-testid="factory-console-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Factory Console</h3>
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </div>
        <Button
          size="sm" variant="destructive" onClick={onStop}
          disabled={!isRunning} data-testid="factory-stop-all-button"
        >
          <Square className="mr-1 h-4 w-4" /> Stop All
        </Button>
      </div>

      {counts && (
        <div className="mb-3 text-xs text-muted-foreground flex gap-3 flex-wrap">
          <span>Total: <b>{counts.total}</b></span>
          <span className="text-green-600">Done: {counts.completed}</span>
          <span className="text-blue-600">Running: {counts.running}</span>
          <span className="text-gray-500">Queued: {counts.queued}</span>
          {counts.failed > 0 && <span className="text-red-600">Failed: {counts.failed}</span>}
        </div>
      )}

      {runId && (
        <div className="text-xs text-muted-foreground mb-2">
          Run: <code className="bg-muted px-1 rounded">{runId.slice(0, 8)}</code>
          {runStatus && <span className="ml-2 uppercase font-medium">{runStatus}</span>}
        </div>
      )}

      <div className="max-h-48 overflow-y-auto border rounded bg-muted/30">
        {attemptList.length === 0 ? (
          <div className="p-2 text-xs text-muted-foreground text-center">No attempts yet</div>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {attemptList.map((att) => (
                <tr key={att.attemptId} data-testid="factory-attempt-row" className="border-b last:border-0">
                  <td className="p-1.5 w-8">
                    <span className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[att.status] || "bg-gray-300"}`} />
                  </td>
                  <td className="p-1.5 font-mono text-muted-foreground">{att.attemptId.slice(0, 8)}</td>
                  <td className="p-1.5 font-mono">{att.taskId.slice(0, 8)}</td>
                  <td className="p-1.5 uppercase text-muted-foreground">{att.status}</td>
                  <td className="p-1.5 truncate max-w-[200px] text-muted-foreground">
                    {att.lastLogLine || <span className="italic">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
