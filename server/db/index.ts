import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dbPath = path.join(process.cwd(), "data", "vibe-kanban.db");

// Lazy initialization to ensure data directory exists first
let _sqlite: Database.Database | null = null;
let _db: BetterSQLite3Database<typeof schema> | null = null;

function getDb() {
  if (!_db) {
    // Ensure directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    _sqlite = new Database(dbPath);
    _db = drizzle(_sqlite, { schema });
  }
  return _db;
}

// Proxy to make lazy initialization transparent
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get: (_, prop) => {
    const dbInstance = getDb();
    return (dbInstance as any)[prop];
  }
});

// Initialize database
export function initDB() {
  // Ensure db is initialized first
  getDb();

  // Create tables if they don't exist
  _sqlite!.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      git_url TEXT NOT NULL,
      repo_path TEXT,
      default_branch TEXT NOT NULL DEFAULT 'main',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      queued_at INTEGER,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      agent TEXT NOT NULL DEFAULT 'Claude Sonnet 4.5',
      base_branch TEXT NOT NULL DEFAULT 'main',
      branch_name TEXT,
      base_commit TEXT,
      head_commit TEXT,
      worktree_path TEXT,
      container_id TEXT,
      merge_status TEXT NOT NULL DEFAULT 'not_merged',
      status TEXT NOT NULL DEFAULT 'pending',
      exit_code INTEGER,
      run_requested_by TEXT,
      applied_at INTEGER,
      apply_error TEXT,
      pr_number INTEGER,
      pr_url TEXT,
      pr_status TEXT,
      conflict_files TEXT
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL REFERENCES attempts(id),
      timestamp INTEGER NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL REFERENCES attempts(id),
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS processed_webhooks (
      delivery_id TEXT PRIMARY KEY,
      event TEXT NOT NULL,
      processed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS planning_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      idea_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS council_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES planning_sessions(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS plan_drafts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES planning_sessions(id),
      goals TEXT NOT NULL,
      milestones TEXT NOT NULL,
      tasks TEXT NOT NULL,
      questions TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Add PR columns to attempts table if they don't exist (migration)
  try {
    _sqlite!.exec(`
      ALTER TABLE attempts ADD COLUMN pr_number INTEGER;
      ALTER TABLE attempts ADD COLUMN pr_url TEXT;
      ALTER TABLE attempts ADD COLUMN pr_status TEXT;
      ALTER TABLE attempts ADD COLUMN conflict_files TEXT;
    `);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn("Warning during migration:", error.message);
    }
  }

  // Add queue columns to attempts table if they don't exist (migration)
  try {
    _sqlite!.exec(`
      ALTER TABLE attempts ADD COLUMN queued_at INTEGER;
      ALTER TABLE attempts ADD COLUMN run_requested_by TEXT;
    `);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn("Warning during migration:", error.message);
    }
  }

  // Add ownership columns (migration)
  try {
    _sqlite!.exec(`
      ALTER TABLE projects ADD COLUMN owner_id TEXT;
      ALTER TABLE attempts ADD COLUMN applied_by TEXT;
    `);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn("Warning during migration:", error.message);
    }
  }

  // Add execution orchestrator columns (migration)
  try {
    _sqlite!.exec(`
      ALTER TABLE projects ADD COLUMN execution_status TEXT NOT NULL DEFAULT 'idle';
      ALTER TABLE projects ADD COLUMN execution_started_at INTEGER;
      ALTER TABLE projects ADD COLUMN execution_finished_at INTEGER;
    `);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn("Warning during migration:", error.message);
    }
  }

  // Create Project Chat tables (H10)
  _sqlite!.exec(`
    CREATE TABLE IF NOT EXISTS project_messages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS council_threads (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      iteration_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'discussing',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS council_thread_messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES council_threads(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Add planning session columns for Apply Plan idempotency (migration)
  try {
    _sqlite!.exec(`
      ALTER TABLE planning_sessions ADD COLUMN project_id TEXT REFERENCES projects(id);
      ALTER TABLE planning_sessions ADD COLUMN product_result TEXT;
      ALTER TABLE planning_sessions ADD COLUMN applied_task_ids TEXT;
    `);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn("Warning during migration:", error.message);
    }
  }

  console.log("✅ Database initialized");
}
