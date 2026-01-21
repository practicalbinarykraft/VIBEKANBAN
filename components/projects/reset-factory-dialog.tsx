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
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface ResetFactoryDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ResetFactoryDialog({ open, onClose, onConfirm }: ResetFactoryDialogProps) {
  const [resetting, setResetting] = useState(false);

  const handleConfirm = async () => {
    setResetting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setResetting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent data-testid="reset-factory-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Factory State?</AlertDialogTitle>
          <AlertDialogDescription>
            This will stop the current Factory run and clear queued tasks.
            <br /><br />
            <strong>Tasks will NOT be deleted.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            data-testid="reset-confirm-button"
            onClick={handleConfirm}
            disabled={resetting}
          >
            {resetting ? "Resetting..." : "Reset Factory"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
