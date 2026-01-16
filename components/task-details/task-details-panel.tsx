"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Task, Attempt, AttemptWithStats } from "@/types";
import { TaskDetailsHeader } from "./task-details-header";
import { TaskActions } from "./task-actions";
import { ExecutionDetails } from "./execution-details";
import { AttemptsHistory } from "./attempts-history";
import { TaskEmptyState } from "./task-empty-state";
import { TaskTabs } from "./task-tabs";
import { PRPreviewContainer } from "./pr-preview-container";
import { ConflictBlock } from "./conflict-block";
import { ExecutionResultSummary, parseExecutionResult } from "./execution-result-summary";
import { ReadOnlyBanner } from "@/components/ui/readonly-banner";
import { useAttemptStream } from "@/hooks/useAttemptStream";
import { useTaskActions } from "@/hooks/useTaskActions";
import { useExecutionReadiness } from "@/hooks/useExecutionReadiness";
import { parseUnifiedDiff } from "@/lib/diff-parser";
import { mockDiffs } from "@/lib/mock-data";
import {
  formatEstimate,
  formatPriority,
  parseTags,
  getPriorityColor,
  getEstimateColor,
} from "@/lib/task-enrichment-format";

interface TaskDetailsPanelProps {
  task: Task;
  selectedAttemptId: string | null;
  attempts: AttemptWithStats[];
  attemptsLoading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskDetailsPanel({
  task,
  selectedAttemptId,
  attempts,
  attemptsLoading,
  onClose,
  onEdit,
  onDelete,
}: TaskDetailsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const executionReadiness = useExecutionReadiness(task.projectId);

  const {
    isRunning,
    isApplying,
    isCreatingPR,
    permissionError,
    handleRunTask,
    handleStopExecution,
    handleApply,
    handleCreatePR,
  } = useTaskActions({
    taskId: task.id,
    projectId: task.projectId,
    selectedAttemptId,
    onAttemptUpdate: setSelectedAttempt,
  });

  const fetchAttemptData = async () => {
    if (!selectedAttemptId) { setSelectedAttempt(null); return; }
    try {
      const response = await fetch(`/api/attempts/${selectedAttemptId}`);
      setSelectedAttempt(response.ok ? await response.json() : null);
    } catch { setSelectedAttempt(null); }
  };

  useEffect(() => { fetchAttemptData(); }, [selectedAttemptId]);

  const latestAttempt = attempts.length > 0 ? attempts[0] : null;
  const isSelectedAttemptRunning = selectedAttempt?.status === "running" || selectedAttempt?.status === "queued";
  const isLatestAttemptRunning = latestAttempt?.status === "running" || latestAttempt?.status === "queued";
  const hasActivePR = selectedAttempt?.prUrl && selectedAttempt?.status === "completed";
  const shouldStream = (isSelectedAttemptRunning && selectedAttemptId === latestAttempt?.id) || hasActivePR;
  const stream = useAttemptStream(shouldStream ? selectedAttemptId : null);
  const currentStatus = stream.status || selectedAttempt?.status || latestAttempt?.status;
  const displayLogs = shouldStream && stream.logs.length > 0 ? stream.logs : (selectedAttempt as any)?.logs || [];
  const artifacts = (selectedAttempt as any)?.artifacts || [];
  const diffArtifact = artifacts.find((a: any) => a.type === "diff");
  const summaryArtifact = artifacts.find((a: any) => a.type === "summary");
  const executionResult = summaryArtifact ? parseExecutionResult(summaryArtifact.content) : null;
  const diffs = diffArtifact ? parseUnifiedDiff(diffArtifact.content) : (selectedAttempt?.id ? mockDiffs[selectedAttempt.id] : null) || [];
  const hasDiff = diffs.length > 0 || diffArtifact !== undefined;
  const applyError = selectedAttempt?.applyError || null;
  const handleSelectAttempt = (attemptId: string) => router.push(`/projects/${task.projectId}?task=${searchParams.get("task")}&attempt=${attemptId}`);
  const handleResolveConflict = async () => {
    if (!selectedAttemptId) return;
    setIsResolvingConflict(true);
    try {
      const response = await fetch(`/api/attempts/${selectedAttemptId}/resolve-conflict`, { method: "POST" });
      if (response.ok) {
        const refreshResponse = await fetch(`/api/attempts/${selectedAttemptId}`);
        if (refreshResponse.ok) setSelectedAttempt(await refreshResponse.json());
      }
    } finally { setIsResolvingConflict(false); }
  };
  const handleCancelQueued = async () => {
    if (!selectedAttemptId) return;
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/attempts/${selectedAttemptId}/cancel`, { method: "POST" });
      if (response.ok) {
        const refreshResponse = await fetch(`/api/attempts/${selectedAttemptId}`);
        if (refreshResponse.ok) setSelectedAttempt(await refreshResponse.json());
      }
    } finally { setIsCancelling(false); }
  };
  const hasConflict = selectedAttempt?.mergeStatus === "conflict";
  const emptyState = attemptsLoading ? <TaskEmptyState type="loading" /> : attempts.length === 0 ? <TaskEmptyState type="no-attempts" /> : (selectedAttemptId && !selectedAttempt) ? <TaskEmptyState type="attempt-not-found" /> : null;
  return (
    <div className="flex h-full w-[40%] flex-col bg-muted/20" data-testid="task-details-panel">
      <TaskDetailsHeader
        task={task}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="pb-2">
          <p className="text-xs text-muted-foreground/70 leading-relaxed" data-testid="task-description">{task.description}</p>
        </div>
        {(task.priority || task.estimate || task.tags) && (
          <div className="pb-2 flex flex-wrap gap-3 text-xs" data-testid="task-enrichment">
            <span className="text-muted-foreground">Priority: <span className={getPriorityColor(task.priority)} data-testid="task-priority">{formatPriority(task.priority)}</span></span>
            <span className="text-muted-foreground">Estimate: <span className={getEstimateColor(task.estimate)} data-testid="task-estimate">{formatEstimate(task.estimate)}</span></span>
            <span className="text-muted-foreground" data-testid="task-tags">Tags: {parseTags(task.tags).length > 0 ? parseTags(task.tags).map((t) => <span key={t} className="ml-1 px-1.5 py-0.5 bg-muted rounded">{t}</span>) : '—'}</span>
          </div>
        )}
        {!executionReadiness.isLoading && !executionReadiness.isReady && (
          <ReadOnlyBanner reason={executionReadiness.reason} />
        )}
        <TaskActions
          latestAttempt={latestAttempt}
          currentStatus={currentStatus}
          isRunning={isRunning}
          isApplying={isApplying}
          hasDiff={hasDiff}
          applyError={applyError}
          hasConflict={hasConflict}
          permissionError={permissionError}
          executionDisabled={!executionReadiness.isReady}
          onRun={handleRunTask}
          onApply={handleApply}
          onStop={handleStopExecution}
          onCancel={handleCancelQueued}
        />
        {executionResult && (
          <ExecutionResultSummary result={executionResult} prUrl={selectedAttempt?.prUrl} />
        )}
        {hasConflict && selectedAttempt && (
          <ConflictBlock
            conflictFiles={selectedAttempt.conflictFiles || []}
            worktreePath={selectedAttempt.worktreePath || '/tmp/unknown'}
            isResolving={isResolvingConflict}
            onMarkResolved={handleResolveConflict}
          />
        )}
        {selectedAttempt?.status === "completed" && !hasConflict && (
          <PRPreviewContainer
            selectedAttempt={selectedAttempt}
            selectedAttemptId={selectedAttemptId!}
            isCreatingPR={isCreatingPR}
            onCreatePR={handleCreatePR}
            ssePrStatus={stream.prStatus}
            permissionError={permissionError}
          />
        )}
        {emptyState || (
          selectedAttempt && (
            <>
              <ExecutionDetails
                attempt={selectedAttempt}
                onCopyToClipboard={(text) => navigator.clipboard.writeText(text)}
              />
              <AttemptsHistory
                attempts={attempts}
                selectedAttemptId={selectedAttemptId}
                loading={attemptsLoading}
                onSelectAttempt={handleSelectAttempt}
              />
            </>
          )
        )}
        {selectedAttempt && (
          <TaskTabs
            logs={displayLogs}
            diffs={diffs}
            artifacts={artifacts}
            connectionStatus={shouldStream ? stream.connectionStatus : undefined}
            attemptId={selectedAttemptId}
          />
        )}
      </div>
    </div>
  );
}