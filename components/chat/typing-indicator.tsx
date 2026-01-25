/**
 * TypingIndicator - Animated dots showing AI is thinking (PR-127)
 *
 * Displays three pulsing dots to indicate the AI is processing.
 * Replaces text-based status messages for better chat UX.
 */

"use client";

import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex justify-start" data-testid="typing-indicator">
      <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-pulse" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:0.2s]" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
}
