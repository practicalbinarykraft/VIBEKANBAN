/** Factory PR Status Cell (PR-98) - Display CI check status with badge */
"use client";

import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2 } from "lucide-react";
import type { PrCheckStatus } from "@/server/services/factory/factory-pr-checks.service";

interface FactoryPrStatusCellProps {
  status: PrCheckStatus | null;
  prUrl: string | null;
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<PrCheckStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  success: { label: "Success", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export function FactoryPrStatusCell({ status, prUrl, isLoading }: FactoryPrStatusCellProps) {
  // Loading state
  if (isLoading) {
    return (
      <div data-testid="pr-status-loading" className="flex items-center gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Checking...</span>
      </div>
    );
  }

  // No PR
  if (!prUrl) {
    return <span className="text-xs text-muted-foreground">No PR</span>;
  }

  const config = status ? STATUS_CONFIG[status] : null;

  return (
    <a
      href={prUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="pr-status-link"
      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
    >
      {config ? (
        <Badge
          data-testid="pr-status-badge"
          data-status={status}
          variant={config.variant}
          className="text-xs"
        >
          {config.label}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs">PR</Badge>
      )}
      <ExternalLink className="h-3 w-3 text-muted-foreground" />
    </a>
  );
}
