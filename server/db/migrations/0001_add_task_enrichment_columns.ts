/**
 * Migration: Add task enrichment columns
 *
 * Adds estimate, priority, and tags columns to tasks table
 * for storing enrichment data from plan-to-tasks converter.
 */

import Database from 'better-sqlite3';

export function migrate(sqlite: Database.Database): void {
  // Add estimate column (S | M | L)
  try {
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN estimate TEXT;`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('Migration warning (estimate):', error.message);
    }
  }

  // Add priority column (P1 | P2 | P3)
  try {
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN priority TEXT;`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('Migration warning (priority):', error.message);
    }
  }

  // Add tags column (JSON string array)
  try {
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN tags TEXT;`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('Migration warning (tags):', error.message);
    }
  }
}
