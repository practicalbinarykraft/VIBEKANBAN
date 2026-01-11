import { Project, Task, Attempt, DiffFile, LogEntry } from "@/types";

export const mockProjects: Project[] = [
  {
    id: "1",
    name: "vibe-kanban",
    gitUrl: "https://github.com/practicalbinarykraft/VIBEKANBAN",
    defaultBranch: "main",
    createdAt: new Date("2026-01-07"),
  },
];

export const mockTasks: Task[] = [
  {
    id: "1",
    projectId: "1",
    title: "Implement user authentication",
    description: "Add OAuth2 authentication flow using NextAuth.js",
    status: "todo",
    order: 0,
    createdAt: new Date("2026-01-07T10:00:00"),
    updatedAt: new Date("2026-01-07T10:00:00"),
  },
  {
    id: "2",
    projectId: "1",
    title: "Create Kanban board UI",
    description: "Build the main kanban interface with drag-and-drop",
    status: "in_progress",
    order: 0,
    createdAt: new Date("2026-01-07T11:00:00"),
    updatedAt: new Date("2026-01-07T14:30:00"),
  },
  {
    id: "3",
    projectId: "1",
    title: "Setup Docker runner",
    description: "Configure isolated Docker containers for agent execution",
    status: "in_review",
    order: 0,
    createdAt: new Date("2026-01-07T09:00:00"),
    updatedAt: new Date("2026-01-07T15:00:00"),
  },
  {
    id: "4",
    projectId: "1",
    title: "Add WebSocket support",
    description: "Implement real-time log streaming via WebSockets",
    status: "done",
    order: 0,
    createdAt: new Date("2026-01-06T14:00:00"),
    updatedAt: new Date("2026-01-07T12:00:00"),
  },
];

export const mockAttempts: Record<string, Attempt> = {
  "2": {
    id: "attempt-1",
    taskId: "2",
    startedAt: new Date("2026-01-07T14:00:00"),
    agent: "Claude Sonnet 4.5",
    baseBranch: "main",
    worktreePath: "/tmp/vibekanban-worktree-2",
    mergeStatus: "not_merged",
    status: "running",
  },
  "3": {
    id: "attempt-2",
    taskId: "3",
    startedAt: new Date("2026-01-07T13:00:00"),
    finishedAt: new Date("2026-01-07T15:00:00"),
    agent: "Claude Sonnet 4.5",
    baseBranch: "main",
    worktreePath: "/tmp/vibekanban-worktree-3",
    mergeStatus: "not_merged",
    status: "completed",
    exitCode: 0,
  },
};

export const mockDiffs: Record<string, DiffFile[]> = {
  "attempt-2": [
    {
      path: "server/docker-runner.ts",
      additions: 156,
      deletions: 12,
      changes: `@@ -1,12 +1,156 @@
-import { exec } from 'child_process';
+import { spawn } from 'child_process';
+import Docker from 'dockerode';
+
+const docker = new Docker();
+
+export class DockerRunner {
+  private containerId: string | null = null;
+
+  async start(worktreePath: string) {
+    const container = await docker.createContainer({
+      Image: 'node:18-alpine',
+      Cmd: ['/bin/sh'],
+      WorkingDir: '/workspace',
+      HostConfig: {
+        Binds: [\`\${worktreePath}:/workspace\`],
+        NetworkMode: 'none',
+      },
+    });
+
+    await container.start();
+    this.containerId = container.id;
+    return container.id;
+  }
+}`,
    },
    {
      path: "server/routes/tasks.ts",
      additions: 45,
      deletions: 8,
      changes: `@@ -10,8 +10,45 @@
 router.post('/tasks/:id/run', async (req, res) => {
-  // TODO: Implement task execution
-  res.json({ status: 'pending' });
+  const { id } = req.params;
+  const task = await db.tasks.findById(id);
+
+  if (!task) {
+    return res.status(404).json({ error: 'Task not found' });
+  }
+
+  const worktreePath = await createWorktree(task);
+  const runner = new DockerRunner();
+
+  try {
+    const containerId = await runner.start(worktreePath);
+    const attempt = await db.attempts.create({
+      taskId: task.id,
+      containerId,
+      worktreePath,
+      status: 'running',
+    });
+
+    res.json({ attemptId: attempt.id });
+  } catch (error) {
+    res.status(500).json({ error: error.message });
+  }
 });`,
    },
  ],
};

export const mockLogs: Record<string, LogEntry[]> = {
  "attempt-1": [
    {
      timestamp: new Date("2026-01-07T14:00:05"),
      level: "info",
      message: "Initializing task execution environment",
    },
    {
      timestamp: new Date("2026-01-07T14:00:08"),
      level: "info",
      message: "Creating git worktree at /tmp/vibekanban-worktree-2",
    },
    {
      timestamp: new Date("2026-01-07T14:00:12"),
      level: "info",
      message: "Worktree created successfully",
    },
    {
      timestamp: new Date("2026-01-07T14:00:15"),
      level: "info",
      message: "Starting Docker container",
    },
    {
      timestamp: new Date("2026-01-07T14:00:22"),
      level: "info",
      message: "Container started: vibe-kanban-runner-2",
    },
    {
      timestamp: new Date("2026-01-07T14:00:25"),
      level: "info",
      message: "Setup script running...",
    },
    {
      timestamp: new Date("2026-01-07T14:00:30"),
      level: "info",
      message: "Installing dependencies: npm install",
    },
    {
      timestamp: new Date("2026-01-07T14:01:45"),
      level: "info",
      message: "Dependencies installed successfully",
    },
    {
      timestamp: new Date("2026-01-07T14:01:50"),
      level: "info",
      message: "Starting Claude CLI agent",
    },
    {
      timestamp: new Date("2026-01-07T14:01:55"),
      level: "info",
      message: "Agent: Analyzing codebase structure...",
    },
    {
      timestamp: new Date("2026-01-07T14:02:10"),
      level: "info",
      message: "Agent: Creating components/kanban/Board.tsx",
    },
  ],
  "attempt-2": [
    {
      timestamp: new Date("2026-01-07T13:00:05"),
      level: "info",
      message: "Initializing task execution environment",
    },
    {
      timestamp: new Date("2026-01-07T13:00:12"),
      level: "info",
      message: "Worktree created successfully",
    },
    {
      timestamp: new Date("2026-01-07T13:00:25"),
      level: "info",
      message: "Container started successfully",
    },
    {
      timestamp: new Date("2026-01-07T13:05:30"),
      level: "info",
      message: "Agent completed task successfully",
    },
    {
      timestamp: new Date("2026-01-07T13:05:35"),
      level: "info",
      message: "Collecting artifacts: diffs, logs, summary",
    },
    {
      timestamp: new Date("2026-01-07T13:05:40"),
      level: "info",
      message: "Task execution completed with exit code 0",
    },
  ],
};
