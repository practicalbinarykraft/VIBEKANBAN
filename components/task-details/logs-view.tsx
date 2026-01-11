import { LogEntry } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";

interface LogsViewProps {
  logs: LogEntry[];
  connectionStatus?: "connecting" | "connected" | "disconnected" | "reconnecting";
  attemptId?: string | null;
}

const levelColors = {
  info: "text-blue-500",
  warning: "text-amber-500",
  error: "text-red-500",
};

const connectionStatusColors = {
  connecting: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  connected: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 animate-pulse",
  disconnected: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30",
  reconnecting: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 animate-pulse",
};

// Helper to safely convert timestamp to Date
function asDate(ts: unknown): Date {
  if (ts instanceof Date) return ts;
  if (typeof ts === "number") return new Date(ts);
  if (typeof ts === "string") return new Date(ts);
  return new Date();
}

export function LogsView({ logs, connectionStatus = "disconnected", attemptId }: LogsViewProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (logs.length === 0) {
    return (
      <div className="h-full rounded border border-border bg-black/[0.02] dark:bg-black/60 flex flex-col">
        {connectionStatus && connectionStatus !== "disconnected" && (
          <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5 bg-muted/20">
            <span className="text-[10px] text-muted-foreground">Connection</span>
            <div className="flex items-center gap-2 flex-1 justify-end">
              {attemptId && (
                <button
                  onClick={() => copyToClipboard(attemptId)}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-background/50 text-[10px] text-muted-foreground/70 font-mono"
                  title="Copy attempt ID"
                >
                  <span>#{attemptId.slice(0, 8)}</span>
                  <Copy className="h-2.5 w-2.5 shrink-0" />
                </button>
              )}
              <Badge variant="outline" className={cn("text-[10px] h-5 px-2", connectionStatusColors[connectionStatus])}>
                {connectionStatus === "connected" ? "Live" : connectionStatus}
              </Badge>
            </div>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground/50">No logs yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded border border-border bg-black/[0.02] dark:bg-black/60 font-mono text-[10px] leading-[1.25] flex flex-col">
      {connectionStatus && connectionStatus !== "disconnected" && (
        <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5 bg-muted/20 shrink-0">
          <span className="text-[10px] text-muted-foreground">Connection</span>
          <div className="flex items-center gap-2 flex-1 justify-end">
            {attemptId && (
              <button
                onClick={() => copyToClipboard(attemptId)}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-background/50 text-[10px] text-muted-foreground/70 font-mono"
                title="Copy attempt ID"
              >
                <span>#{attemptId.slice(0, 8)}</span>
                <Copy className="h-2.5 w-2.5 shrink-0" />
              </button>
            )}
            <Badge variant="outline" className={cn("text-[10px] h-5 px-2", connectionStatusColors[connectionStatus])}>
              {connectionStatus === "connected" ? "Live" : connectionStatus}
            </Badge>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-1">
        <div>
          {logs.map((log, index) => {
            const d = asDate(log.timestamp);
            const time = isNaN(d.getTime())
              ? "--:--:--"
              : d.toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <div key={index} className="flex gap-1.5 items-start py-0.5 px-1 hover:bg-white/5 dark:hover:bg-white/5">
                <span className="text-muted-foreground/40 shrink-0 w-[50px] text-right font-medium">
                  {time}
                </span>
                <span className={cn("shrink-0 w-[44px] font-semibold", levelColors[log.level])}>
                  {log.level === "info" ? "INFO" : log.level === "warning" ? "WARN" : "ERR "}
                </span>
                <span className="flex-1 text-foreground/90">{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
