/**
 * TasksView - Tasks tab content for project page
 */

import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskDetailsPanel } from "@/components/task-details/task-details-panel";
import { ExecutionControls } from "@/components/project/execution-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

interface TasksViewProps {
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
}

export function TasksView({
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
}: TasksViewProps) {
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
            <Button onClick={onCreateTaskClick} size="sm" className="h-8 text-xs">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-auto">
          <KanbanBoard
            tasks={filteredTasks}
            selectedTaskId={selectedTaskId}
            onTaskClick={onTaskClick}
            isRefreshing={isRefreshing}
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
