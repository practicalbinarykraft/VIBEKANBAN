"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteProjectDialogProps {
  open: boolean;
  projectName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteProjectDialog({ open, projectName, onClose, onConfirm }: DeleteProjectDialogProps) {
  const [typedName, setTypedName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = typedName === projectName;

  const handleConfirm = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
      setTypedName("");
    }
  };

  const handleClose = () => {
    setTypedName("");
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent data-testid="delete-project-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{projectName}</strong> and all its tasks,
            factory runs, attempts, logs, and artifacts. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="confirm-name">
            Type <strong>{projectName}</strong> to confirm
          </Label>
          <Input
            id="confirm-name"
            data-testid="delete-confirm-input"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={projectName}
            className="mt-2"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            data-testid="delete-confirm-button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canDelete || deleting}
          >
            {deleting ? "Deleting..." : "Delete Project"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
