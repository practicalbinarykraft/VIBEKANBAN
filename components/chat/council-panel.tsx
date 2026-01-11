/**
 * CouncilPanel - AI Council discussion display
 *
 * Right column: Read-only council discussion
 * Shows messages from PM, Architect, Backend, Frontend, QA
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface CouncilMessage {
  id: string;
  role: "product" | "architect" | "backend" | "frontend" | "qa";
  content: string;
  createdAt: Date;
}

interface CouncilThread {
  id: string;
  messages: CouncilMessage[];
  iterationNumber: number;
}

interface CouncilPanelProps {
  thread: CouncilThread | null;
}

const roleConfig = {
  product: { label: "Product Manager", color: "bg-blue-500" },
  architect: { label: "Architect", color: "bg-purple-500" },
  backend: { label: "Backend", color: "bg-green-500" },
  frontend: { label: "Frontend", color: "bg-yellow-500" },
  qa: { label: "QA", color: "bg-red-500" },
};

export function CouncilPanel({ thread }: CouncilPanelProps) {
  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center" data-testid="council-panel">
        <div className="text-sm text-muted-foreground">
          <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>AI Council discussion will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4" data-testid="council-panel">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">AI Council Discussion</h3>
          <Badge variant="outline" className="ml-auto text-xs">
            Iteration #{thread.iterationNumber}
          </Badge>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {thread.messages.map((msg) => (
          <div
            key={msg.id}
            className="rounded-lg border bg-card p-3"
            data-testid={`council-message-${msg.role}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${roleConfig[msg.role].color}`} />
              <span className="text-xs font-semibold">{roleConfig[msg.role].label}</span>
            </div>
            <p className="text-sm text-muted-foreground">{msg.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
