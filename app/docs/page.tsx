import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

export default function DocsPage() {
  return (
    <AppShell>
      <div className="min-h-[calc(100vh-3rem)] bg-muted/20">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mb-2 flex items-center justify-center gap-2">
              <h1 className="text-3xl font-semibold">Documentation</h1>
              <Badge variant="secondary" className="text-xs">
                Coming Soon
              </Badge>
            </div>
            <p className="mb-8 text-sm text-muted-foreground">
              Learn how to use Vibe Kanban to orchestrate AI coding agents
            </p>

            <div className="mx-auto max-w-md space-y-3 text-left">
              <h3 className="text-sm font-semibold">Planned documentation:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  <span>Quick start guide: Create your first project and task</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  <span>Docker runner configuration and isolation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  <span>Git worktree management and PR workflows</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  <span>MCP server integration and custom tools</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
