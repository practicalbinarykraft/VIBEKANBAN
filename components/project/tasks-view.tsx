/**
 * TasksView - Tasks tab content for project page
 */
"use client";

import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskDetailsPanel } from "@/components/task-details/task-details-panel";
import { ExecutionControls } from "@/components/project/execution-controls";
import { RepoStatus } from "@/components/project/repo-status";
import { FactoryBatchStartPanel, type BatchStartRequest } from "@/components/factory/factory-batch-start-panel";
import { FactoryResultsPanel } from "@/components/factory/factory-results-panel";
import { useFactoryResults } from "@/hooks/useFactoryResults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, CheckSquare } from "lucide-react";

interface TasksViewProps {
  projectId: string;
  filteredTasks: any[];
  selectedTaskId: string | null;
  selectedTask: any;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onCreateTaskClick: () => void;
  onTaskClick: (taskId: string) => void;
  onCloseDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  executionStatus: any;
  executionLoading: boolean;
  isRefreshing: boolean;
  onRunAll: () => void;
  onPause: () => void;
  onResume: () => void;
  attempts: any[];
  selectedAttemptId: string | null;
  attemptsLoading: boolean;
  highlightedTaskIds?: string[];
  // Batch start props (PR-87)
  showBatchPanel?: boolean;
  checkedTaskIds?: string[];
  showCheckboxes?: boolean;
  tasksByStatus?: Record<string, number>;
  isFactoryRunning?: boolean;
  isBatchStarting?: boolean;
  onBatchStart?: (params: BatchStartRequest) => void;
  onTaskCheckChange?: (taskId: string, checked: boolean) => void;
  onToggleCheckboxes?: () => void;
}

export function TasksView({
  projectId,
  filteredTasks,
  selectedTaskId,
  selectedTask,
  searchQuery,
  onSearchChange,
  onCreateTaskClick,
  onTaskClick,
  onCloseDetails,
  onEdit,
  onDelete,
  executionStatus,
  executionLoading,
  isRefreshing,
  onRunAll,
  onPause,
  onResume,
  attempts,
  selectedAttemptId,
  attemptsLoading,
  highlightedTaskIds = [],
  showBatchPanel = false,
  checkedTaskIds = [],
  showCheckboxes = false,
  tasksByStatus = {},
  isFactoryRunning = false,
  isBatchStarting = false,
  onBatchStart,
  onTaskCheckChange,
  onToggleCheckboxes,
}: TasksViewProps) {
  const factoryResults = useFactoryResults(projectId);

  return (
    <div className="flex h-[calc(100vh-7rem)]">
      {/* Left: Kanban Navigation - 60% */}
      <div className="flex w-[60%] flex-col overflow-hidden border-r border-border">
        {/* Header */}
        <div className="border-b border-border bg-background px-3 py-2">
          <div className="flex items-center gap-2">
            <ExecutionControls
              executionStatus={executionStatus}
              loading={executionLoading}
              onRunAll={onRunAll}
              onPause={onPause}
              onResume={onResume}
            />
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            {showBatchPanel && onToggleCheckboxes && (
              <Button
                onClick={onToggleCheckboxes}
                size="sm"
                variant={showCheckboxes ? "secondary" : "outline"}
                className="h-8 text-xs"
                data-testid="toggle-checkboxes-button"
              >
                <CheckSquare className="mr-1 h-3.5 w-3.5" />
                Select
              </Button>
            )}
            <Button onClick={onCreateTaskClick} size="sm" className="h-8 text-xs">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Task
            </Button>
          </div>
          {/* Repo Status */}
          <div className="mt-2 flex items-center">
            <RepoStatus projectId={projectId} />
          </div>
          {/* Batch Start Panel (PR-87) */}
          {showBatchPanel && onBatchStart && (
            <div className="mt-2">
              <FactoryBatchStartPanel
                projectId={projectId}
                selectedTaskIds={checkedTaskIds}
                tasksByStatus={tasksByStatus}
                isFactoryRunning={isFactoryRunning}
                isStarting={isBatchStarting}
                onStart={onBatchStart}
              />
            </div>
          )}
          {/* Factory Results Panel (PR-89) */}
          <div className="mt-2">
            <FactoryResultsPanel
              data={factoryResults.data}
              loading={factoryResults.loading}
              error={factoryResults.error}
              projectId={projectId}
            />
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-auto">
          <KanbanBoard
            tasks={filteredTasks}
            selectedTaskId={selectedTaskId}
            onTaskClick={onTaskClick}
            isRefreshing={isRefreshing}
            highlightedTaskIds={highlightedTaskIds}
            checkedTaskIds={checkedTaskIds}
            showCheckboxes={showCheckboxes}
            onTaskCheckChange={onTaskCheckChange}
          />
        </div>
      </div>

      {/* Right: Execution Panel - 40% */}
      {selectedTask ? (
        <TaskDetailsPanel
          task={selectedTask}
          selectedAttemptId={selectedAttemptId}
          attempts={attempts}
          attemptsLoading={attemptsLoading}
          onClose={onCloseDetails}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        <div className="flex w-[40%] flex-col items-center justify-center border-l-2 border-border bg-muted/10">
          <p className="text-sm text-muted-foreground">Select a task to view execution details</p>
        </div>
      )}
    </div>
  );
}
