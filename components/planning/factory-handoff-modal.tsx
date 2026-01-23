/**
 * FactoryHandoffModal - Explicit transition from Planning to Factory
 *
 * Solves UX Problem #6, #8: User doesn't understand that plan became a Factory run.
 * Shows clear confirmation of what happened and where to go next.
 */

"use client";

import { CheckCircle2, Rocket, ExternalLink, ListTodo } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FactoryHandoffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  taskCount: number;
  factoryRunId?: string;
  onViewFactory?: () => void;
  onStayInPlanning?: () => void;
}

export function FactoryHandoffModal({
  open,
  onOpenChange,
  projectId,
  taskCount,
  factoryRunId,
  onViewFactory,
  onStayInPlanning,
}: FactoryHandoffModalProps) {
  const handleViewFactory = () => {
    onViewFactory?.();
    onOpenChange(false);
  };

  const handleStayInPlanning = () => {
    onStayInPlanning?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="factory-handoff-modal">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-xl">Tasks Created!</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Your plan has been converted to executable tasks.
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="rounded-lg border bg-muted/50 p-4 my-2">
          <div className="flex items-center gap-3 mb-3">
            <ListTodo className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{taskCount} tasks created</p>
              <p className="text-sm text-muted-foreground">
                Ready for Factory execution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Rocket className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Next step: Start Factory</p>
              <p className="text-sm text-muted-foreground">
                Go to Tasks tab and click "Start Factory" to begin execution
              </p>
            </div>
          </div>
        </div>

        {/* What changed */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p><span className="font-medium">What happened:</span></p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Plan is now locked (read-only)</li>
            <li>Tasks appear in the Tasks tab</li>
            <li>You can start Factory to execute them</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            className="flex-1"
            onClick={handleViewFactory}
            asChild={!onViewFactory}
          >
            {onViewFactory ? (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Go to Tasks
              </>
            ) : (
              <Link href={`/projects/${projectId}?tab=tasks`}>
                <Rocket className="mr-2 h-4 w-4" />
                Go to Tasks
              </Link>
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleStayInPlanning}
          >
            Stay in Planning
          </Button>
        </div>

        {/* Factory run link if available */}
        {factoryRunId && (
          <div className="text-center mt-2">
            <Link
              href={`/projects/${projectId}/factory/runs/${factoryRunId}`}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View Factory Run Details
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
