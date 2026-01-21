/**
 * Migration: Add factory_pr_autofix table (PR-99)
 *
 * Tracks auto-fix attempts on PRs to prevent infinite loops.
 * Each PR gets at most 1 auto-fix attempt.
 */

import Database from "better-sqlite3";

export function migrate(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS factory_pr_autofix (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      pr_url TEXT NOT NULL,
      attempt_number INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL,
      error_text TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // Create index for fast lookup by pr_url
  try {
    sqlite.exec(`CREATE INDEX idx_factory_pr_autofix_pr_url ON factory_pr_autofix(pr_url);`);
  } catch (error: any) {
    if (!error.message.includes("already exists")) {
      throw error;
    }
  }
}
