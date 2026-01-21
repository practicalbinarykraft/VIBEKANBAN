"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProjectModals } from "@/components/project/project-modals";
import { useTaskAttempts } from "@/hooks/useTaskAttempts";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { useProjectExecution } from "@/hooks/useProjectExecution";
import { ChatPage } from "@/components/chat/chat-page";
import { ProjectTabs } from "@/components/project/project-tabs";
import { TasksView } from "@/components/project/tasks-view";
import { PlanningTab } from "@/components/planning/planning-tab";
import { AutopilotPanel } from "@/components/planning/autopilot-panel";
import { AutopilotRunHistory } from "@/components/autopilot/autopilot-run-history";
import { AutopilotRunSummaryPanel, type SummaryPanelStatus } from "@/components/autopilot/autopilot-run-summary-panel";
import { AutopilotEntryPanel } from "@/components/autopilot/autopilot-entry-panel";
import { AutopilotReadinessPanel } from "@/components/autopilot/autopilot-readiness-panel";
import { FactoryControlsPanel } from "@/components/factory/factory-controls-panel";
import { FactoryConsolePanel } from "@/components/factory/factory-console-panel";
import { useAutopilot } from "@/hooks/useAutopilot";
import { useFactoryStream } from "@/hooks/useFactoryStream";
import { useAutopilotReadiness } from "@/hooks/useAutopilotReadiness";
import { useFactoryStatus } from "@/hooks/useFactoryStatus";
import { useRunHistory } from "@/hooks/useRunHistory";
import { useAutopilotRunDetails } from "@/hooks/useAutopilotRunDetails";
import { useFactoryBatchStart } from "@/hooks/useFactoryBatchStart";
import { useFactoryRunResults } from "@/hooks/useFactoryRunResults";
import { FactoryRunResultsPanel } from "@/components/factory/factory-run-results-panel";
import type { BatchStartRequest } from "@/components/factory/factory-batch-start-panel";

interface ProjectClientProps {
  projectId: string;
  enableAutopilotV2?: boolean;
}

type TabType = "tasks" | "chat" | "planning";

export default function ProjectClient({ projectId, enableAutopilotV2 = false }: ProjectClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [searchQuery, setSearchQuery] = useState("");
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);
  const [createPROpen, setCreatePROpen] = useState(false);
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<string[]>([]);

  // Batch start state (PR-87)
  const [checkedTaskIds, setCheckedTaskIds] = useState<string[]>([]);
  const [showCheckboxes, setShowCheckboxes] = useState(false);

  // Autopilot state (lifted from PlanningTab to survive tab switch)
  const [autopilotSessionId, setAutopilotSessionId] = useState<string | null>(null);
  const [autopilotTaskIds, setAutopilotTaskIds] = useState<string[]>([]);

  // Track if we've already auto-selected a task on mount
  const hasAutoSelectedRef = useRef(false);

  const selectedTaskId = searchParams.get("task");

  // Use hooks for data management
  const {
    tasks,
    loading,
    isRefreshing,
    error,
    refreshTasks,
    handleCreateTask: createTask,
    handleSaveTask: saveTask,
    handleConfirmDelete: deleteTask,
  } = useProjectTasks(projectId);

  const { attempts, selectedAttemptId, loading: attemptsLoading, refetchAttempts } = useTaskAttempts(
    selectedTaskId,
    projectId
  );

  const {
    executionStatus,
    loading: executionLoading,
    handleRunAll,
    handlePause,
    handleResume,
  } = useProjectExecution(projectId, { onTasksChanged: refreshTasks });

  // Run history hook (PR-67)
  const runHistory = useRunHistory(projectId);

  // PR-81: Autopilot readiness check (blockers panel)
  const readiness = useAutopilotReadiness(projectId);

  // PR-83: Factory status and controls
  const factory = useFactoryStatus(projectId);

  // PR-84: Factory stream for console panel
  const factoryStream = useFactoryStream(projectId);
  const showFactoryConsole = factory.status === "running" || !!factory.runId;

  // PR-88: Factory run results
  const showFactoryResults = factory.runId && factory.status !== "running";
  const factoryResults = useFactoryRunResults(projectId, showFactoryResults ? factory.runId : null);

  // PR-87: Batch start hook
  const batchStart = useFactoryBatchStart();

  // PR-87: Compute tasksByStatus for batch panel
  const tasksByStatus = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // PR-79: Get latest finished run for summary panel
  const latestRun = runHistory.runs[0];
  const finishedStatuses = ["completed", "failed", "cancelled"];
  const isFinishedRun = latestRun && finishedStatuses.includes(latestRun.status);
  const latestRunDetails = useAutopilotRunDetails(isFinishedRun ? latestRun.runId : null);
  // Get first prUrl from attempts (if any)
  const latestRunPrUrl = latestRunDetails.run?.attempts?.find(a => a.prUrl)?.prUrl ?? null;

  // Autopilot hook (at project level so it survives tab switch)
  const autopilot = useAutopilot(
    projectId,
    autopilotSessionId,
    undefined, // onBatchComplete
    () => {
      // onAllComplete - reset autopilot state
      setAutopilotSessionId(null);
      setAutopilotTaskIds([]);
    },
    undefined // onTaskComplete
  );

  const handleAutopilotSession = (sessionId: string, taskIds: string[]) => {
    setAutopilotSessionId(sessionId);
    setAutopilotTaskIds(taskIds);
  };

  // Autopilot control handlers (at project level)
  const handleStartAutopilotStep = async () => {
    if (!autopilotSessionId || autopilotTaskIds.length === 0) return;
    await autopilot.start("STEP", autopilotTaskIds);
  };

  const handleStartAutopilotAuto = async () => {
    if (!autopilotSessionId || autopilotTaskIds.length === 0) return;
    await autopilot.start("AUTO", autopilotTaskIds);
  };

  // PR-79: Handle "Run again" from summary panel
  const handleRunAgain = async () => {
    try {
      await fetch(`/api/autopilot/runs/${projectId}/start`, { method: "POST" });
      runHistory.refresh();
    } catch {
      // Error handling is done by the runner
    }
  };

  // Expose refresh functions for tests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__VIBE__ = {
        ...(window as any).__VIBE__,
        refetchAttempts,
        refreshTasks,
      };
    }
  }, [refetchAttempts, refreshTasks]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  // Auto-select first in-progress task on mount (only once)
  useEffect(() => {
    // If a task is already selected on mount, mark that we've handled auto-selection
    if (selectedTaskId && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      return;
    }

    // Only auto-select if:
    // 1. No task is currently selected
    // 2. We haven't auto-selected before (prevents re-triggering after close)
    // 3. We have tasks to select from
    if (!selectedTaskId && !hasAutoSelectedRef.current && tasks.length > 0) {
      const inProgressTask = tasks.find((t) => t.status === "in_progress");
      const taskToSelect = inProgressTask || tasks[0];
      router.replace(`/projects/${projectId}?task=${taskToSelect.id}`);
      hasAutoSelectedRef.current = true;
    }
  }, [selectedTaskId, tasks, router, projectId]);

  const handleTaskClick = (taskId: string) => {
    router.push(`/projects/${projectId}?task=${taskId}`);
  };

  const handleCloseDetails = () => {
    router.push(`/projects/${projectId}`);
  };

  // PR-87: Batch start handlers
  const handleTaskCheckChange = (taskId: string, checked: boolean) => {
    setCheckedTaskIds((prev) =>
      checked ? [...prev, taskId] : prev.filter((id) => id !== taskId)
    );
  };

  const handleToggleCheckboxes = () => {
    setShowCheckboxes((prev) => !prev);
    if (showCheckboxes) {
      setCheckedTaskIds([]);
    }
  };

  const handleBatchStart = async (params: BatchStartRequest) => {
    const result = await batchStart.startBatch(projectId, params);
    if (result) {
      factory.refresh();
      setCheckedTaskIds([]);
    }
  };

  // PR-88: Factory results handlers
  const handleRetryTask = async (taskId: string) => {
    // Use batch start with single task
    await batchStart.startBatch(projectId, {
      source: "selection",
      taskIds: [taskId],
      maxParallel: 1,
    });
    factory.refresh();
  };

  const handleOpenLogs = (attemptId: string) => {
    // Navigate to attempt details (using task view with attempt selected)
    const item = factoryResults.results?.items.find(i => i.attemptId === attemptId);
    if (item) {
      router.push(`/projects/${projectId}?task=${item.taskId}`);
    }
  };

  const handleCreateTask = async (
    title: string,
    description: string,
    startImmediately: boolean
  ) => {
    await createTask(title, description, startImmediately);
    setCreateTaskOpen(false);
  };

  const handleEditTask = () => {
    setEditTaskOpen(true);
  };

  const handleSaveTask = async (
    taskId: string,
    updates: { title: string; description: string }
  ) => {
    await saveTask(taskId, updates);
  };

  const handleDeleteTask = () => {
    setDeleteTaskOpen(true);
  };

  const handleConfirmDelete = async (taskId: string) => {
    await deleteTask(taskId, selectedTaskId);
  };

  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading tasks...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {error && (
        <div className="bg-destructive/10 text-destructive border-destructive border px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* PR-79: Autopilot Run Summary Panel - shows when last run finished */}
      {enableAutopilotV2 && isFinishedRun && latestRun && (
        <div className="mx-4 mt-2">
          <AutopilotRunSummaryPanel
            projectId={projectId}
            runId={latestRun.runId}
            status={latestRun.status.toUpperCase() as SummaryPanelStatus}
            prUrl={latestRunPrUrl}
            onRunAgain={handleRunAgain}
          />
        </div>
      )}

      {/* PR-81: Autopilot Readiness Panel - shows blockers when not ready */}
      {enableAutopilotV2 && !readiness.ready && (
        <div className="mx-4 mt-2">
          <AutopilotReadinessPanel
            ready={readiness.ready}
            blockers={readiness.blockers}
          />
        </div>
      )}

      {/* PR-80: Autopilot Entry Panel - start/stop autopilot */}
      {enableAutopilotV2 && (
        <div className="mx-4 mt-2">
          <AutopilotEntryPanel
            projectId={projectId}
            onStarted={runHistory.refresh}
            onStopped={runHistory.refresh}
          />
        </div>
      )}

      {/* PR-83: Factory Controls Panel - parallel task execution (Tasks tab only) */}
      {enableAutopilotV2 && activeTab === "tasks" && (
        <div className="mx-4 mt-2">
          <FactoryControlsPanel
            projectId={projectId}
            status={factory.status}
            total={factory.total}
            completed={factory.completed}
            failed={factory.failed}
            cancelled={factory.cancelled}
            running={factory.running}
            queued={factory.queued}
            runId={factory.runId}
            isLoading={factory.isLoading}
            isStarting={factory.isStarting}
            isStopping={factory.isStopping}
            error={factory.error}
            onStart={factory.start}
            onStop={factory.stop}
          />
        </div>
      )}

      {/* PR-84: Factory Console Panel - live attempts timeline */}
      {enableAutopilotV2 && activeTab === "tasks" && showFactoryConsole && (
        <div className="mx-4 mt-2">
          <FactoryConsolePanel
            isConnected={factoryStream.isConnected}
            runId={factoryStream.runId}
            runStatus={factoryStream.runStatus}
            attempts={factoryStream.attempts}
            counts={factoryStream.counts}
            onStop={factory.stop}
          />
        </div>
      )}

      {/* PR-88: Factory Run Results Panel - shows when run finished */}
      {enableAutopilotV2 && activeTab === "tasks" && showFactoryResults && (
        <div className="mx-4 mt-2">
          <FactoryRunResultsPanel
            results={factoryResults.results}
            isLoading={factoryResults.isLoading}
            error={factoryResults.error}
            onRetry={handleRetryTask}
            onOpenLogs={handleOpenLogs}
          />
        </div>
      )}

      {/* Tasks View */}
      {activeTab === "tasks" && (
        <TasksView
          projectId={projectId}
          filteredTasks={filteredTasks}
          selectedTaskId={selectedTaskId}
          selectedTask={selectedTask || null}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateTaskClick={() => setCreateTaskOpen(true)}
          onTaskClick={handleTaskClick}
          onCloseDetails={handleCloseDetails}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          executionStatus={executionStatus}
          executionLoading={executionLoading}
          isRefreshing={isRefreshing}
          onRunAll={handleRunAll}
          onPause={handlePause}
          onResume={handleResume}
          attempts={attempts}
          selectedAttemptId={selectedAttemptId}
          attemptsLoading={attemptsLoading}
          highlightedTaskIds={highlightedTaskIds}
          showBatchPanel={enableAutopilotV2}
          checkedTaskIds={checkedTaskIds}
          showCheckboxes={showCheckboxes}
          tasksByStatus={tasksByStatus}
          isFactoryRunning={factory.status === "running"}
          isBatchStarting={batchStart.isStarting}
          onBatchStart={handleBatchStart}
          onTaskCheckChange={handleTaskCheckChange}
          onToggleCheckboxes={handleToggleCheckboxes}
        />
      )}

      {/* Chat View */}
      {activeTab === "chat" && (
        <div className="h-[calc(100vh-7rem)]">
          <ChatPage projectId={projectId} />
        </div>
      )}

      {/* Planning View */}
      {activeTab === "planning" && (
        <div className="h-[calc(100vh-7rem)]">
          <PlanningTab
            projectId={projectId}
            enableAutopilotV2={enableAutopilotV2}
            onApplyComplete={(createdTaskIds) => {
              setActiveTab("tasks");
              setHighlightedTaskIds(createdTaskIds);
              refreshTasks();
              // Clear highlight after 1.5s
              setTimeout(() => setHighlightedTaskIds([]), 1500);
            }}
            onExecuteComplete={(createdTaskIds) => {
              setActiveTab("tasks");
              setHighlightedTaskIds(createdTaskIds);
              refreshTasks();
              // Start execution after tasks are created
              handleRunAll();
              // Clear highlight after 1.5s
              setTimeout(() => setHighlightedTaskIds([]), 1500);
            }}
            onPipelineComplete={(createdTaskIds) => {
              setActiveTab("tasks");
              setHighlightedTaskIds(createdTaskIds);
              refreshTasks();
              // Autopilot: start execution after apply
              handleRunAll();
              // Clear highlight after 1.5s
              setTimeout(() => setHighlightedTaskIds([]), 1500);
            }}
            onAutopilotSessionCreated={handleAutopilotSession}
          />
        </div>
      )}

      {/* Project-level Autopilot Panel - survives tab switch */}
      {enableAutopilotV2 && autopilotSessionId && (
        <div className="fixed bottom-4 right-4 z-50 w-96">
          <AutopilotPanel
            status={autopilot.status}
            mode={autopilot.mode}
            currentBatch={autopilot.currentBatch}
            progress={autopilot.progress}
            totalBatches={autopilot.totalBatches}
            taskProgress={autopilot.taskProgress}
            totalTasks={autopilotTaskIds.length}
            completedTasks={autopilot.completedTasks}
            currentTaskId={autopilot.currentTaskId}
            pauseReason={autopilot.pauseReason}
            error={autopilot.error}
            isStarting={autopilot.isStarting}
            isApproving={autopilot.isApproving}
            isCanceling={autopilot.isCanceling}
            isExecuting={autopilot.isExecuting}
            onStartStep={handleStartAutopilotStep}
            onStartAuto={handleStartAutopilotAuto}
            onResume={autopilot.resume}
            onApprove={autopilot.approve}
            onCancel={autopilot.cancel}
          />
        </div>
      )}

      {/* Autopilot Run History Panel (PR-67) */}
      {enableAutopilotV2 && (
        <div className="fixed bottom-4 left-4 z-50 w-80">
          <AutopilotRunHistory
            projectId={projectId}
            runs={runHistory.runs}
            isLoading={runHistory.isLoading}
            selectedRun={runHistory.selectedRun}
            selectedRunLoading={runHistory.selectedRunLoading}
            onSelectRun={runHistory.selectRun}
            onCloseDetails={runHistory.closeDetails}
            onStopRun={runHistory.stopRun}
            stoppingRunId={runHistory.stoppingRunId}
          />
        </div>
      )}

      {/* Modals */}
      <ProjectModals
        createTaskOpen={createTaskOpen}
        editTaskOpen={editTaskOpen}
        deleteTaskOpen={deleteTaskOpen}
        createPROpen={createPROpen}
        selectedTask={selectedTask || null}
        onCloseCreateTask={() => setCreateTaskOpen(false)}
        onCloseEditTask={() => setEditTaskOpen(false)}
        onCloseDeleteTask={() => setDeleteTaskOpen(false)}
        onClosePR={() => setCreatePROpen(false)}
        onCreateTask={handleCreateTask}
        onSaveTask={handleSaveTask}
        onConfirmDelete={handleConfirmDelete}
      />
    </AppShell>
  );
}
