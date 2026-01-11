"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Task } from "@/types";

interface DeleteTaskDialogProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirm: (taskId: string) => void;
}

export function DeleteTaskDialog({
  open,
  task,
  onClose,
  onConfirm,
}: DeleteTaskDialogProps) {
  const handleConfirm = () => {
    if (task) {
      onConfirm(task.id);
    }
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Task?</AlertDialogTitle>
          <AlertDialogDescription>
            {task && (
              <>
                Are you sure you want to delete <strong>{task.title}</strong>?
                <br />
                <br />
                This will permanently delete the task and all its execution attempts, logs, and artifacts. This action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Task
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
