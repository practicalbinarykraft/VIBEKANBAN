"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, ExternalLink, BarChart3, RotateCcw, Copy, Eraser, Trash2 } from "lucide-react";
import { Project } from "@/types";
import { EditProjectModal } from "./edit-project-modal";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { ResetFactoryDialog } from "./reset-factory-dialog";

interface FactoryRun {
  id: string;
  status: string;
  maxParallel: number;
}

interface ProjectActionsMenuProps {
  project: Project;
  lastRun?: FactoryRun | null;
  onProjectUpdated?: (project: Project) => void;
  onProjectDeleted?: () => void;
}

export function ProjectActionsMenu({
  project,
  lastRun,
  onProjectUpdated,
  onProjectDeleted,
}: ProjectActionsMenuProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const canRestart = lastRun && ["failed", "cancelled", "completed"].includes(lastRun.status);

  const handleOpenRepo = () => {
    window.open(project.gitUrl, "_blank", "noopener");
  };

  const handleFactoryHistory = () => {
    router.push(`/projects/${project.id}/factory/runs`);
  };

  const handleRestart = async () => {
    if (!lastRun || restarting) return;
    setRestarting(true);
    try {
      await fetch(`/api/projects/${project.id}/factory/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxParallel: lastRun.maxParallel }),
      });
      router.refresh();
    } finally {
      setRestarting(false);
    }
  };

  const handleClone = async () => {
    if (cloning) return;
    setCloning(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/clone`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        router.push(`/projects/${data.project.id}`);
      }
    } finally {
      setCloning(false);
    }
  };

  const handleReset = async () => {
    await fetch(`/api/projects/${project.id}/factory/reset`, { method: "POST" });
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      onProjectDeleted?.();
      router.push("/projects");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            data-testid="project-actions-trigger"
            className="p-1 rounded hover:bg-accent transition-colors cursor-pointer"
            onClick={(e) => e.preventDefault()}
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" data-testid="project-actions-menu">
          <DropdownMenuItem data-testid="action-edit" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit project
          </DropdownMenuItem>
          <DropdownMenuItem data-testid="action-open-repo" onClick={handleOpenRepo}>
            <ExternalLink className="mr-2 h-4 w-4" /> Open repository
          </DropdownMenuItem>
          <DropdownMenuItem data-testid="action-factory-history" onClick={handleFactoryHistory}>
            <BarChart3 className="mr-2 h-4 w-4" /> Factory history
          </DropdownMenuItem>
          {canRestart && (
            <DropdownMenuItem data-testid="action-restart" onClick={handleRestart} disabled={restarting}>
              <RotateCcw className="mr-2 h-4 w-4" /> {restarting ? "Restarting..." : "Restart last run"}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem data-testid="action-clone" onClick={handleClone} disabled={cloning}>
            <Copy className="mr-2 h-4 w-4" /> {cloning ? "Cloning..." : "Clone project"}
          </DropdownMenuItem>
          <DropdownMenuItem data-testid="action-reset" onClick={() => setResetOpen(true)}>
            <Eraser className="mr-2 h-4 w-4" /> Reset factory state
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            data-testid="action-delete"
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditProjectModal
        open={editOpen}
        project={project}
        onClose={() => setEditOpen(false)}
        onSave={(updated) => onProjectUpdated?.(updated)}
      />

      <DeleteProjectDialog
        open={deleteOpen}
        projectName={project.name}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />

      <ResetFactoryDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
      />
    </>
  );
}
