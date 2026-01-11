/**
 * ProjectModals - All modals for project page
 *
 * Responsibility: Render all modals (Create/Edit/Delete/PR) in one place
 * Props-driven, no internal state
 */

import { Task } from "@/types";
import { CreateTaskModal } from "@/components/modals/create-task-modal";
import { EditTaskModal } from "@/components/modals/edit-task-modal";
import { DeleteTaskDialog } from "@/components/modals/delete-task-dialog";
import { CreatePRModal } from "@/components/modals/create-pr-modal";

interface ProjectModalsProps {
  createTaskOpen: boolean;
  editTaskOpen: boolean;
  deleteTaskOpen: boolean;
  createPROpen: boolean;
  selectedTask: Task | null;
  onCloseCreateTask: () => void;
  onCloseEditTask: () => void;
  onCloseDeleteTask: () => void;
  onClosePR: () => void;
  onCreateTask: (title: string, description: string, startImmediately: boolean) => Promise<void>;
  onSaveTask: (taskId: string, updates: { title: string; description: string }) => Promise<void>;
  onConfirmDelete: (taskId: string) => Promise<void>;
}

export function ProjectModals({
  createTaskOpen,
  editTaskOpen,
  deleteTaskOpen,
  createPROpen,
  selectedTask,
  onCloseCreateTask,
  onCloseEditTask,
  onCloseDeleteTask,
  onClosePR,
  onCreateTask,
  onSaveTask,
  onConfirmDelete,
}: ProjectModalsProps) {
  return (
    <>
      <CreateTaskModal
        open={createTaskOpen}
        onClose={onCloseCreateTask}
        onCreateTask={onCreateTask}
      />

      <EditTaskModal
        open={editTaskOpen}
        task={selectedTask || null}
        onClose={onCloseEditTask}
        onSave={onSaveTask}
      />

      <DeleteTaskDialog
        open={deleteTaskOpen}
        task={selectedTask || null}
        onClose={onCloseDeleteTask}
        onConfirm={onConfirmDelete}
      />

      {selectedTask && (
        <CreatePRModal
          open={createPROpen}
          onClose={onClosePR}
          taskTitle={selectedTask.title}
        />
      )}
    </>
  );
}
