"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";

interface NewProjectButtonProps {
  variant?: "default" | "empty-state";
  onProjectCreated?: () => void;
}

export function NewProjectButton({ variant = "default", onProjectCreated }: NewProjectButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [gitUrl, setGitUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          gitUrl: gitUrl.trim() || `https://github.com/example/${name.trim().toLowerCase().replace(/\s+/g, "-")}`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create project");
      }

      setOpen(false);
      setName("");
      setGitUrl("");
      onProjectCreated?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const buttonContent = variant === "empty-state" ? (
    <>
      <Plus className="mr-1.5 h-4 w-4" />
      Create your first project
    </>
  ) : (
    <>
      <Plus className="mr-1.5 h-4 w-4" />
      New Project
    </>
  );

  return (
    <>
      <Button onClick={() => setOpen(true)} data-testid="new-project-button">
        {buttonContent}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="new-project-modal">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project to manage with AI agents
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="my-awesome-project"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="new-project-name-input"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gitUrl">Git Repository URL (optional)</Label>
                <Input
                  id="gitUrl"
                  placeholder="https://github.com/org/repo"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  data-testid="new-project-git-url-input"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive" data-testid="new-project-error">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} data-testid="create-project-submit">
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
