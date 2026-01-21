import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
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
  // Connection status fields
  connectionStatus: text("connection_status").default("not_checked"), // not_checked, connected, auth_missing, error, not_found
  connectionLastCheckedAt: integer("connection_last_checked_at", { mode: "timestamp" }),
  connectionError: text("connection_error"), // Error message if connection failed
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
  autopilotRunId: text("autopilot_run_id"), // PR-73: link to autopilot session
  factoryRunId: text("factory_run_id"), // PR-91: link to factory run
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
  status: text("status").notNull().default("discussing"), // discussing, awaiting_response, plan_ready, approved, completed
  ideaText: text("idea_text"), // Original user idea
  language: text("language").notNull().default("en"), // User language (en, ru, etc.)
  currentTurn: integer("current_turn").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const councilThreadMessages = sqliteTable("council_thread_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull().references(() => councilThreads.id),
  role: text("role").notNull(), // product, architect, backend, frontend, qa
  content: text("content").notNull(),
  kind: text("kind").notNull().default("message"), // message, question, concern, proposal, consensus
  turnIndex: integer("turn_index").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Plan artifacts with versioning (EPIC-9)
export const planArtifacts = sqliteTable("plan_artifacts", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull().references(() => councilThreads.id),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("draft"), // draft, revised, approved, final
  summary: text("summary").notNull(),
  scope: text("scope").notNull(),
  tasks: text("tasks").notNull(), // JSON array of {title, description, type, estimate}
  taskCount: integer("task_count").notNull().default(0),
  estimate: text("estimate").notNull().default("M"), // S, M, L
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Global settings (BYOK keys, AI provider config)
export const settings = sqliteTable("settings", {
  id: text("id").primaryKey().default("global"), // Single row for MVP
  provider: text("provider").notNull().default("demo"), // demo, anthropic, openai
  anthropicApiKey: text("anthropic_api_key"), // User's Anthropic key
  openaiApiKey: text("openai_api_key"), // User's OpenAI key
  model: text("model").default("claude-sonnet-4-20250514"), // Selected model
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// AI Cost Events (PR-47) - tracks AI usage and estimated costs
export const aiCostEvents = sqliteTable("ai_cost_events", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  projectId: text("project_id"),
  threadId: text("thread_id"), // council thread if applicable
  source: text("source").notNull(), // council, plan, autopilot, other
  provider: text("provider").notNull(), // anthropic, openai, mock, db
  model: text("model"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  totalTokens: integer("total_tokens"),
  estimatedCostUsd: real("estimated_cost_usd"), // USD cost as decimal
  metadataJson: text("metadata_json"), // JSON string for additional context
});

// Factory Runs (PR-91) - tracks factory execution sessions
export const factoryRuns = sqliteTable("factory_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  status: text("status").notNull().default("running"), // running, completed, failed, cancelled
  mode: text("mode").notNull().default("column"), // column, selection
  maxParallel: integer("max_parallel").notNull().default(1),
  selectedTaskIds: text("selected_task_ids"), // JSON array for selection mode
  columnId: text("column_id"), // column status for column mode
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  error: text("error"),
});

// Autopilot Runs (PR-73) - tracks autopilot execution sessions
export const autopilotRuns = sqliteTable("autopilot_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  status: text("status").notNull().default("running"), // running, completed, failed, cancelled
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  error: text("error"),
});

// Provider Accounts (PR-52, PR-54) - stores provider balances and refresh state
export const providerAccounts = sqliteTable("provider_accounts", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(), // anthropic, openai
  accountKey: text("account_key"), // Future use: API key identifier
  balanceUsd: real("balance_usd"), // Current balance (nullable)
  balanceUpdatedAt: integer("balance_updated_at", { mode: "timestamp" }),
  balanceSource: text("balance_source").notNull().default("unknown"), // provider_api, estimator, unknown
  monthlyLimitUsd: real("monthly_limit_usd"), // From env var
  spendUsdMonthToDate: real("spend_usd_month_to_date"), // PR-54: spend this month
  note: text("note"), // PR-54: optional note (e.g., "auto-refresh")
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Factory PR Auto-Fix (PR-99) - tracks auto-fix attempts on PRs (anti-loop)
export const factoryPrAutofix = sqliteTable("factory_pr_autofix", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  prUrl: text("pr_url").notNull(),
  attemptNumber: integer("attempt_number").notNull().default(1), // Always 1 for now
  status: text("status").notNull(), // success, failed
  errorText: text("error_text"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});
