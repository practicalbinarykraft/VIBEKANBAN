/**
 * AutopilotRunSummaryPanel (PR-79) - Summary panel for completed runs
 *
 * Shows final state of autopilot run with actions:
 * - COMPLETED: View details, Open PR (if available), Run again
 * - FAILED: View error details, Retry
 * - CANCELLED: Run again, View details
 */
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Ban, ExternalLink, RotateCcw, ArrowRight } from "lucide-react";

export type SummaryPanelStatus = "COMPLETED" | "FAILED" | "CANCELLED";

interface AutopilotRunSummaryPanelProps {
  projectId: string;
  runId: string;
  status: SummaryPanelStatus;
  prUrl?: string | null;
  summaryText?: string | null;
  onRunAgain: () => void;
}

const STATUS_CONFIG: Record<SummaryPanelStatus, {
  title: string;
  defaultSubtitle: string;
  icon: React.ReactNode;
  variant: "success" | "error" | "warning";
}> = {
  COMPLETED: {
    title: "Autopilot completed",
    defaultSubtitle: "Review results and merge when ready.",
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    variant: "success",
  },
  FAILED: {
    title: "Autopilot failed",
    defaultSubtitle: "Open details to see logs and guidance.",
    icon: <XCircle className="h-5 w-5 text-destructive" />,
    variant: "error",
  },
  CANCELLED: {
    title: "Autopilot cancelled",
    defaultSubtitle: "You can start again anytime.",
    icon: <Ban className="h-5 w-5 text-muted-foreground" />,
    variant: "warning",
  },
};

const VARIANT_STYLES: Record<string, string> = {
  success: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30",
  error: "border-destructive/30 bg-destructive/5",
  warning: "border-muted bg-muted/30",
};

export function AutopilotRunSummaryPanel({
  projectId,
  runId,
  status,
  prUrl,
  summaryText,
  onRunAgain,
}: AutopilotRunSummaryPanelProps) {
  const config = STATUS_CONFIG[status];
  const subtitle = summaryText || config.defaultSubtitle;
  const detailsUrl = `/projects/${projectId}/autopilot/runs/${runId}`;

  return (
    <div
      className={`rounded-lg border p-4 ${VARIANT_STYLES[config.variant]}`}
      data-testid="autopilot-run-summary-panel"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{config.icon}</div>
        <div className="flex-1">
          <h3 className="font-medium" data-testid="autopilot-summary-title">
            {config.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-3 flex flex-wrap gap-2" data-testid="autopilot-summary-actions">
            {status === "COMPLETED" && (
              <>
                <Link href={detailsUrl}>
                  <Button variant="default" size="sm">
                    <ArrowRight className="mr-1 h-4 w-4" />
                    View run details
                  </Button>
                </Link>
                {prUrl && (
                  <Link href={prUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-1 h-4 w-4" />
                      Open PR
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={onRunAgain}>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Run again
                </Button>
              </>
            )}

            {status === "FAILED" && (
              <>
                <Link href={detailsUrl}>
                  <Button variant="default" size="sm">
                    <ArrowRight className="mr-1 h-4 w-4" />
                    View error details
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={onRunAgain}>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Retry
                </Button>
              </>
            )}

            {status === "CANCELLED" && (
              <>
                <Button variant="default" size="sm" onClick={onRunAgain}>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Run again
                </Button>
                <Link href={detailsUrl}>
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="mr-1 h-4 w-4" />
                    View run details
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
