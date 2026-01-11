/**
 * ApplyStatusMessage - Display messages for Apply button states
 *
 * Responsibility: Show error messages or explanations why Apply is disabled
 * Props-driven, no internal state
 */

import { AlertCircle, Info } from "lucide-react";

interface ApplyStatusMessageProps {
  type: "error" | "no-changes";
  message?: string;
}

export function ApplyStatusMessage({ type, message }: ApplyStatusMessageProps) {
  if (type === "error") {
    return (
      <div
        className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs"
        data-testid="apply-error"
      >
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-destructive">Apply failed</p>
          <p className="text-destructive/80 mt-1">
            {message || "An error occurred while applying changes"}
          </p>
        </div>
      </div>
    );
  }

  if (type === "no-changes") {
    return (
      <div
        className="flex items-start gap-2 rounded-md border border-muted bg-muted/30 p-2 text-xs"
        data-testid="no-changes-message"
      >
        <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-muted-foreground">No changes to apply</p>
          <p className="text-muted-foreground/70 mt-1">
            {message || "The agent produced no code changes"}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
