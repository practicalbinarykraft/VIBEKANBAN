/**
 * TaskTabs - Tabs for Logs/Diffs/Summary views
 *
 * Responsibility: Display tabs and tab content for execution artifacts
 * Props-driven, no internal state or side effects
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogsView } from "./logs-view";
import { DiffsView } from "./diffs-view";
import { SummaryView } from "./summary-view";

interface TaskTabsProps {
  logs: any[];
  diffs: any[];
  artifacts: any[];
  connectionStatus?: "connecting" | "connected" | "disconnected" | "reconnecting";
  attemptId: string | null;
}

export function TaskTabs({ logs, diffs, artifacts, connectionStatus, attemptId }: TaskTabsProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 pt-2" data-testid="task-tabs">
      <Tabs defaultValue="logs" className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-full h-8 bg-muted/40 mb-2">
          <TabsTrigger value="logs" className="flex-1 text-xs" data-testid="tab-logs">
            Logs
          </TabsTrigger>
          <TabsTrigger value="diffs" className="flex-1 text-xs" data-testid="tab-diffs">
            Diffs
            {diffs.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 px-1">
                {diffs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex-1 text-xs" data-testid="tab-summary">
            Summary
            {artifacts.filter((a: any) => a.type === "summary").length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 px-1">
                ✓
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="logs" className="flex-1 min-h-0 mt-0">
          <LogsView
            logs={logs}
            connectionStatus={connectionStatus}
            attemptId={attemptId}
          />
        </TabsContent>
        <TabsContent value="diffs" className="flex-1 min-h-0 mt-0">
          <DiffsView diffs={diffs} />
        </TabsContent>
        <TabsContent value="summary" className="flex-1 min-h-0 mt-0">
          <SummaryView artifacts={artifacts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
