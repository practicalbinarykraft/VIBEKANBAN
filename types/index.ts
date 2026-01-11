export type TaskStatus = "todo" | "in_progress" | "in_review" | "done" | "cancelled";

export interface Project {
  id: string;
  name: string;
  gitUrl: string;
  defaultBranch: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AttemptStatus = "pending" | "queued" | "running" | "completed" | "failed" | "stopped";
export type MergeStatus = "not_merged" | "merged" | "conflict" | "resolved";

export interface Attempt {
  id: string;
  taskId: string;
  queuedAt?: Date;
  startedAt: Date;
  finishedAt?: Date;
  agent: string;
  baseBranch: string;
  branchName?: string;
  baseCommit?: string;
  headCommit?: string;
  worktreePath: string;
  mergeStatus: MergeStatus;
  status: AttemptStatus;
  exitCode?: number;
  runRequestedBy?: string;
  appliedAt?: Date;
  applyError?: string;
  prNumber?: number;
  prUrl?: string;
  prStatus?: 'open' | 'merged' | 'closed';
  conflictFiles?: string[];
}

export interface AttemptWithStats extends Attempt {
  logsCount: number;
  artifactsCount: number;
}

export type ArtifactType = "log" | "diff" | "patch" | "summary";

export interface Artifact {
  id: string;
  attemptId: string;
  type: ArtifactType;
  content: string;
  createdAt: Date;
}

export interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  changes: string;
}

export interface LogEntry {
  timestamp: Date;
  level: "info" | "warning" | "error";
  message: string;
}
