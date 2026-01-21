"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Project } from "@/types";

interface EditProjectModalProps {
  open: boolean;
  project: Project;
  onClose: () => void;
  onSave: (project: Project) => void;
}

export function EditProjectModal({ open, project, onClose, onSave }: EditProjectModalProps) {
  const [name, setName] = useState(project.name);
  const [gitUrl, setGitUrl] = useState(project.gitUrl);
  const [defaultBranch, setDefaultBranch] = useState(project.defaultBranch);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gitUrl, defaultBranch }),
      });
      if (response.ok) {
        const updated = await response.json();
        onSave(updated);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="edit-project-modal">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>Update project settings</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              data-testid="edit-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gitUrl">Repository URL</Label>
            <Input
              id="gitUrl"
              data-testid="edit-git-url-input"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="branch">Default branch</Label>
            <Input
              id="branch"
              data-testid="edit-branch-input"
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button data-testid="save-project-button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
