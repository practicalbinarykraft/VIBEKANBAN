import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Server } from "lucide-react";

export default function MCPServersPage() {
  return (
    <AppShell>
      <div className="min-h-[calc(100vh-3rem)] bg-muted/20">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
              <Server className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mb-2 flex items-center justify-center gap-2">
              <h1 className="text-3xl font-semibold">MCP Servers</h1>
              <Badge variant="secondary" className="text-xs">
                Coming Soon
              </Badge>
            </div>
            <p className="mb-8 text-sm text-muted-foreground">
              Connect Model Context Protocol servers to enhance AI agent capabilities
            </p>

            <div className="mx-auto max-w-md space-y-3 text-left">
              <h3 className="text-sm font-semibold">Planned features:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  <span>Configure and manage MCP server connections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  <span>Browse available tools and resources from servers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  <span>Monitor server health and connection status</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  <span>Test server capabilities before agent execution</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
