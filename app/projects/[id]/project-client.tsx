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

interface ProjectClientProps {
  projectId: string;
}

type TabType = "tasks" | "chat";

export default function ProjectClient({ projectId }: ProjectClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [searchQuery, setSearchQuery] = useState("");
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false);
  const [createPROpen, setCreatePROpen] = useState(false);

  // Track if we've already auto-selected a task on mount
  const hasAutoSelectedRef = useRef(false);

  const selectedTaskId = searchParams.get("task");

  // Use hooks for data management
  const {
    tasks,
    loading,
    error,
    fetchTasks,
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
    handleRunAll: baseHandleRunAll,
    handlePause,
    handleResume,
  } = useProjectExecution(projectId);

  // Wrap handleRunAll to refetch tasks after execution starts
  const handleRunAll = async () => {
    await baseHandleRunAll();
    await fetchTasks();
  };

  // Expose refetchAttempts for tests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__VIBE__ = {
        ...(window as any).__VIBE__,
        refetchAttempts,
      };
    }
  }, [refetchAttempts]);

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
          onRunAll={handleRunAll}
          onPause={handlePause}
          onResume={handleResume}
          attempts={attempts}
          selectedAttemptId={selectedAttemptId}
          attemptsLoading={attemptsLoading}
        />
      )}

      {/* Chat View */}
      {activeTab === "chat" && (
        <div className="h-[calc(100vh-7rem)]">
          <ChatPage projectId={projectId} />
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
