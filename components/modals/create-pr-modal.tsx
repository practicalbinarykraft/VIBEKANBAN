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

interface CreatePRModalProps {
  open: boolean;
  onClose: () => void;
  taskTitle: string;
}

export function CreatePRModal({
  open,
  onClose,
  taskTitle,
}: CreatePRModalProps) {
  const [title, setTitle] = useState(taskTitle);
  const [description, setDescription] = useState("");
  const [baseBranch, setBaseBranch] = useState("main");

  const handleCreate = () => {
    // In a real app, this would create the PR via GitHub API
    console.log("Creating PR:", { title, description, baseBranch });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create GitHub Pull Request</DialogTitle>
          <DialogDescription>
            Create a new pull request for this task
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="pr-title">Title</Label>
            <Input
              id="pr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pr-description">Description (optional)</Label>
            <Textarea
              id="pr-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="base-branch">Base Branch</Label>
            <Input
              id="base-branch"
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create PR</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
