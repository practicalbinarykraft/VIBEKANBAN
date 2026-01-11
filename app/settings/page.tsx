import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="min-h-[calc(100vh-3rem)] bg-muted/20">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mb-2 flex items-center justify-center gap-2">
              <h1 className="text-3xl font-semibold">Settings</h1>
              <Badge variant="secondary" className="text-xs">
                Coming Soon
              </Badge>
            </div>
            <p className="mb-8 text-sm text-muted-foreground">
              Configure your Vibe Kanban workspace and agent preferences
            </p>

            <div className="mx-auto max-w-md space-y-3 text-left">
              <h3 className="text-sm font-semibold">Planned features:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  <span>Default agent model selection (Claude Sonnet/Opus/Haiku)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  <span>Git configuration and SSH key management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  <span>Docker runner resource limits and network settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  <span>Notification preferences for task completion</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
