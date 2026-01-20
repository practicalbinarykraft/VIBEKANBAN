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
import { useAutopilot } from "@/hooks/useAutopilot";
import { useRunHistory } from "@/hooks/useRunHistory";

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
