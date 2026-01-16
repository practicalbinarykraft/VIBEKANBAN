import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  gitUrl: text("git_url").notNull(),
  repoPath: text("repo_path"), // Local path to git repo on server
  defaultBranch: text("default_branch").notNull().default("main"),
  ownerId: text("owner_id"), // User who owns this project
  executionStatus: text("execution_status").notNull().default("idle"), // idle, running, paused, completed, failed
  executionStartedAt: integer("execution_started_at", { mode: "timestamp" }),
  executionFinishedAt: integer("execution_finished_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("todo"), // todo, in_progress, in_review, done, cancelled
  order: integer("order").notNull().default(0),
  estimate: text("estimate"), // S | M | L (nullable for backward compat)
  priority: text("priority"), // P1 | P2 | P3 (nullable for backward compat)
  tags: text("tags"), // JSON string array (nullable for backward compat)
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const attempts = sqliteTable("attempts", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id),
  queuedAt: integer("queued_at", { mode: "timestamp" }), // When attempt was queued
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  agent: text("agent").notNull().default("Claude Sonnet 4.5"),
  baseBranch: text("base_branch").notNull().default("main"),
  branchName: text("branch_name"), // Git branch created for this attempt
  baseCommit: text("base_commit"), // Git commit SHA before changes
  headCommit: text("head_commit"), // Git commit SHA after changes
  worktreePath: text("worktree_path"),
  containerId: text("container_id"),
  mergeStatus: text("merge_status").notNull().default("not_merged"), // not_merged, merged, conflict, resolved
  status: text("status").notNull().default("pending"), // pending, queued, running, completed, failed, stopped
  exitCode: integer("exit_code"),
  runRequestedBy: text("run_requested_by"), // User who requested the run
  appliedAt: integer("applied_at", { mode: "timestamp" }), // When changes were applied to main branch
  appliedBy: text("applied_by"), // User who applied the changes
  applyError: text("apply_error"), // Error message if apply failed
  prNumber: integer("pr_number"), // GitHub PR number
  prUrl: text("pr_url"), // GitHub PR URL
  prStatus: text("pr_status"), // open, merged, closed
  conflictFiles: text("conflict_files"), // JSON array of conflicted file paths
});

export const logs = sqliteTable("logs", {
  id: text("id").primaryKey(),
  attemptId: text("attempt_id").notNull().references(() => attempts.id),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  level: text("level").notNull(), // info, warning, error
  message: text("message").notNull(),
});

export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey(),
  attemptId: text("attempt_id").notNull().references(() => attempts.id),
  type: text("type").notNull(), // log, diff, patch, summary
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const processedWebhooks = sqliteTable("processed_webhooks", {
  deliveryId: text("delivery_id").primaryKey(),
  event: text("event").notNull(),
  processedAt: integer("processed_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const planningSessions = sqliteTable("planning_sessions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  userId: text("user_id"),
  title: text("title"),
  ideaText: text("idea_text").notNull(),
  status: text("status").notNull().default("DISCUSSION"), // DISCUSSION, RESULT_READY, APPLIED
  productResult: text("product_result"), // JSON string
  appliedTaskIds: text("applied_task_ids"), // JSON string array
  autopilotState: text("autopilot_state"), // JSON string (AutopilotState)
  questionPhaseComplete: integer("question_phase_complete").notNull().default(0), // 0=not complete, 1=complete
  userAnswers: text("user_answers"), // JSON string of user answers to clarifying questions
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const councilMessages = sqliteTable("council_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => planningSessions.id),
  role: text("role").notNull(), // pm, architect, backend, frontend, qa, security
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const planDrafts = sqliteTable("plan_drafts", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => planningSessions.id),
  goals: text("goals").notNull(), // JSON text
  milestones: text("milestones").notNull(), // JSON text
  tasks: text("tasks").notNull(), // JSON array of {title, description, acceptance, status}
  questions: text("questions"), // JSON array (optional)
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Project Chat tables (H10)
export const projectMessages = sqliteTable("project_messages", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  role: text("role").notNull(), // user, product, system
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const councilThreads = sqliteTable("council_threads", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  iterationNumber: integer("iteration_number").notNull(),
  status: text("status").notNull().default("discussing"), // discussing, completed
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const councilThreadMessages = sqliteTable("council_thread_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull().references(() => councilThreads.id),
  role: text("role").notNull(), // product, architect, backend, frontend, qa
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});
