"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreateTask: (title: string, description: string, startImmediately: boolean) => void;
}

export function CreateTaskModal({
  open,
  onClose,
  onCreateTask,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = (startImmediately: boolean) => {
    if (title.trim()) {
      onCreateTask(title, description, startImmediately);
      setTitle("");
      setDescription("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your project board
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Type @ to search files"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleCreate(false)}>
              Create Task
            </Button>
            <Button onClick={() => handleCreate(true)}>Create & Start</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
