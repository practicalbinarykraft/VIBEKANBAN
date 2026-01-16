"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  FolderGit,
  RefreshCw,
  Download,
  Check,
  AlertCircle,
} from "lucide-react";

interface RepoStatusData {
  repoPath: string | null;
  isCloned: boolean;
  gitUrl: string;
  defaultBranch: string;
  error?: string;
}

interface RepoStatusProps {
  projectId: string;
}

export function RepoStatus({ projectId }: RepoStatusProps) {
  const [status, setStatus] = useState<RepoStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch(`/api/projects/${projectId}/repo`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch repo status:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, [projectId]);

  async function handleSync() {
    setSyncing(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/repo`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Failed to sync repo");
      } else {
        setStatus(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to sync repo");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FolderGit className="h-3.5 w-3.5" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {/* Clone Status */}
      <div className="flex items-center gap-1.5">
        {status.isCloned ? (
          <Badge variant="default" className="gap-1 text-[10px]">
            <Check className="h-3 w-3" />
            Cloned
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <AlertCircle className="h-3 w-3" />
            Not Cloned
          </Badge>
        )}
      </div>

      {/* Branch */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <GitBranch className="h-3 w-3" />
        <span>{status.defaultBranch}</span>
      </div>

      {/* Repo Path (if cloned) */}
      {status.repoPath && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[200px] truncate" title={status.repoPath}>
          <FolderGit className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{status.repoPath.split("/").slice(-2).join("/")}</span>
        </div>
      )}

      {/* Clone/Sync Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-6 text-[10px] gap-1"
        onClick={handleSync}
        disabled={syncing}
      >
        {syncing ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : status.isCloned ? (
          <RefreshCw className="h-3 w-3" />
        ) : (
          <Download className="h-3 w-3" />
        )}
        {status.isCloned ? "Sync" : "Clone"}
      </Button>

      {/* Error */}
      {error && (
        <span className="text-[10px] text-destructive max-w-[200px] truncate" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
