"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ConnectionStatusResult, StatusColor } from "@/lib/repo-connection-status";

interface ConnectionBadgeProps {
  projectId: string;
}

const COLOR_CLASSES: Record<StatusColor, string> = {
  gray: "border-gray-500/30 text-gray-600 dark:text-gray-400",
  blue: "border-blue-500/30 text-blue-700 dark:text-blue-400",
  green: "border-green-500/30 text-green-700 dark:text-green-400",
  red: "border-red-500/30 text-red-700 dark:text-red-400",
};

export function ConnectionBadge({ projectId }: ConnectionBadgeProps) {
  const [status, setStatus] = useState<ConnectionStatusResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/connection`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error("Failed to fetch connection status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [projectId]);

  if (loading) {
    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 h-5 border-gray-500/30 text-gray-500"
        data-testid="connection-badge-loading"
      >
        ...
      </Badge>
    );
  }

  if (!status) {
    return null;
  }

  const colorClass = COLOR_CLASSES[status.color] || COLOR_CLASSES.gray;

  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-1.5 py-0 h-5 ${colorClass}`}
      title={status.error || undefined}
      data-testid="connection-badge"
      data-status={status.status}
    >
      {status.label}
    </Badge>
  );
}
