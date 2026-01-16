"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, ExternalLink, Folder, MoreVertical } from "lucide-react";
import { NewProjectButton } from "@/components/projects/new-project-button";
import { ConnectionBadge } from "@/components/projects/connection-badge";
import { Project } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const truncateUrl = (url: string) => {
    const match = url.match(/github\.com\/(.+)/);
    return match ? match[1] : url;
  };

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[calc(100vh-3rem)] bg-muted/20">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-3rem)] bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
                <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] font-medium">
                  {projects.length}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your AI agent orchestration projects
              </p>
            </div>
            <NewProjectButton onProjectCreated={fetchProjects} />
          </div>

          {/* Projects Grid or Empty State */}
          {projects.length === 0 ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Folder className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">No projects yet</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Connect a git repository and start running AI agents on your codebase
                </p>
                <NewProjectButton variant="empty-state" onProjectCreated={fetchProjects} />
                <p className="mt-3 text-xs text-muted-foreground">
                  Takes ~30 seconds. No Docker required for demo.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group"
                >
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md">
                    {/* Header with status */}
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-foreground/80">
                          {project.name}
                        </h3>
                      </div>
                      <div className="ml-2 flex items-center gap-2">
                        <ConnectionBadge projectId={project.id} />
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            // Menu logic
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* Repo link */}
                    <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate" title={project.gitUrl}>
                        {truncateUrl(project.gitUrl)}
                      </span>
                    </div>

                    {/* Branch badge */}
                    <div className="mb-3 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-normal">
                        <GitBranch className="mr-1 h-3 w-3" />
                        {project.defaultBranch}
                      </Badge>
                    </div>

                    {/* Activity meta - compact single line */}
                    <div className="mb-4 text-[11px] text-muted-foreground">
                      Last run · <span className="text-foreground/70">2m ago</span>
                      <span className="mx-2">·</span>
                      Active · <span className="text-foreground/70">1/4</span>
                    </div>

                    {/* Action */}
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 text-xs"
                      >
                        Open Board
                      </Button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
