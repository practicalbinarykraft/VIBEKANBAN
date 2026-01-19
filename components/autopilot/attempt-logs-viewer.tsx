/**
 * AttemptLogsViewer - Display-only component for attempt logs (PR-63)
 * No fetch logic, just renders log lines
 */
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ArrowDown, ArrowUp } from "lucide-react";

export interface LogLine {
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
}

interface AttemptLogsViewerProps {
  lines: LogLine[];
  autoScroll?: boolean;
}

const levelColors: Record<string, string> = {
  info: "text-foreground",
  warning: "text-yellow-600",
  error: "text-red-500",
};

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleTimeString();
}

export function AttemptLogsViewer({
  lines,
  autoScroll = true,
}: AttemptLogsViewerProps) {
  const [copied, setCopied] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(autoScroll);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (scrollEnabled && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, scrollEnabled]);

  const handleCopy = async () => {
    const text = lines.map((l) => `[${l.level}] ${l.message}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (lines.length === 0) {
    return (
      <div className="rounded border bg-muted/30 p-4 text-sm text-muted-foreground">
        No logs available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setScrollEnabled(!scrollEnabled)}
          data-testid="scroll-toggle"
        >
          {scrollEnabled ? (
            <>
              <ArrowDown className="mr-1 h-3 w-3" />
              Auto-scroll on
            </>
          ) : (
            <>
              <ArrowUp className="mr-1 h-3 w-3" />
              Auto-scroll off
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          data-testid="copy-logs"
        >
          {copied ? (
            <>
              <Check className="mr-1 h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-1 h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div
        ref={containerRef}
        className="max-h-80 overflow-y-auto rounded border bg-muted/30 p-3 font-mono text-xs"
        data-testid="logs-container"
      >
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-muted-foreground">
              {formatTimestamp(line.timestamp)}
            </span>
            <span className={levelColors[line.level] || "text-foreground"}>
              {line.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
