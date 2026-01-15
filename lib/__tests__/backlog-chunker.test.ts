/**
 * Backlog Chunker Tests
 * TDD: RED phase - tests for deterministic backlog chunking into PR-sized batches
 */

import { describe, it, expect } from 'vitest';
import { chunkBacklog, Batch } from '../backlog-chunker';

// Sample backlog for testing (50 steps)
const sampleBacklog = [
  'Initialize project repository', 'Setup development environment',
  'Configure package manager', 'Install core dependencies',
  'Setup linting and formatting', 'Configure TypeScript',
  'Setup testing framework', 'Create project structure',
  'Configure environment variables', 'Setup CI/CD pipeline',
  'Design database schema', 'Create database migrations',
  'Setup database connection', 'Implement data models',
  'Add database indexes', 'Configure connection pooling',
  'Create seed data scripts', 'Implement data validation',
  'Implement user registration', 'Create login endpoint',
  'Add password hashing', 'Setup JWT authentication',
  'Implement session management', 'Add logout functionality',
  'Create password reset flow', 'Add email verification',
  'Design API architecture', 'Create base API routes',
  'Implement error handling', 'Add request validation',
  'Setup rate limiting', 'Create API documentation',
  'Add response formatting', 'Implement pagination',
  'Setup frontend framework', 'Create component library',
  'Implement routing', 'Add state management',
  'Create form components', 'Implement loading states',
  'Add error boundaries', 'Create layout components',
  'Write unit tests', 'Create integration tests',
  'Setup E2E testing', 'Add test coverage reporting',
  'Configure production build', 'Setup deployment scripts',
  'Create Docker configuration', 'Configure cloud hosting',
];

describe('chunkBacklog', () => {
  it('should return same output for same input (deterministic)', () => {
    const result1 = chunkBacklog(sampleBacklog);
    const result2 = chunkBacklog(sampleBacklog);
    expect(result1).toEqual(result2);
  });

  it('should preserve all tasks (no loss, no duplicates)', () => {
    const batches = chunkBacklog(sampleBacklog);
    const allTasks = batches.flatMap((b) => b.tasks);

    expect(allTasks.length).toBe(sampleBacklog.length);
    expect(new Set(allTasks).size).toBe(sampleBacklog.length);
    expect(allTasks.sort()).toEqual([...sampleBacklog].sort());
  });

  it('should create batches with size 8-12 by default (never exceed 15)', () => {
    const batches = chunkBacklog(sampleBacklog);

    for (const batch of batches) {
      expect(batch.tasks.length).toBeGreaterThanOrEqual(1);
      expect(batch.tasks.length).toBeLessThanOrEqual(15);
    }

    // Most batches should be 8-12
    const normalBatches = batches.filter(
      (b) => b.tasks.length >= 8 && b.tasks.length <= 12
    );
    expect(normalBatches.length).toBeGreaterThan(batches.length / 2);
  });

  it('should generate stable batchId across runs', () => {
    const batches1 = chunkBacklog(sampleBacklog);
    const batches2 = chunkBacklog(sampleBacklog);

    expect(batches1.map((b) => b.batchId)).toEqual(
      batches2.map((b) => b.batchId)
    );
  });

  it('should have no duplicate batchIds', () => {
    const batches = chunkBacklog(sampleBacklog);
    const ids = batches.map((b) => b.batchId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should generate meaningful batch titles with phase detection', () => {
    const batches = chunkBacklog(sampleBacklog);

    for (const batch of batches) {
      expect(batch.title).toBeTruthy();
      expect(batch.title.length).toBeGreaterThan(10);
      // Should have batch number format
      expect(batch.title).toMatch(/batch \d+\/\d+/i);
    }
  });

  it('should include rationale for each batch', () => {
    const batches = chunkBacklog(sampleBacklog);

    for (const batch of batches) {
      expect(batch.rationale).toBeTruthy();
      expect(batch.rationale.length).toBeGreaterThan(5);
    }
  });

  it('should assign risk level to each batch', () => {
    const batches = chunkBacklog(sampleBacklog);
    const validRisks = ['low', 'med', 'high'];

    for (const batch of batches) {
      expect(validRisks).toContain(batch.risk);
    }
  });

  it('should handle small backlog (< 8 tasks)', () => {
    const smallBacklog = ['Task 1', 'Task 2', 'Task 3'];
    const batches = chunkBacklog(smallBacklog);

    expect(batches.length).toBe(1);
    expect(batches[0].tasks).toEqual(smallBacklog);
  });

  it('should handle large backlog (200 tasks)', () => {
    const largeBacklog = Array.from({ length: 200 }, (_, i) => `Task ${i + 1}`);
    const batches = chunkBacklog(largeBacklog);

    // Should create 15-25 batches for 200 tasks
    expect(batches.length).toBeGreaterThanOrEqual(15);
    expect(batches.length).toBeLessThanOrEqual(25);

    // All tasks preserved
    const allTasks = batches.flatMap((b) => b.tasks);
    expect(allTasks.length).toBe(200);
  });

  it('should respect custom config (minBatchSize, maxBatchSize)', () => {
    const batches = chunkBacklog(sampleBacklog, {
      minBatchSize: 5,
      maxBatchSize: 10,
    });

    for (const batch of batches) {
      expect(batch.tasks.length).toBeLessThanOrEqual(10);
    }
  });

  it('should trim task strings and skip empty', () => {
    const backlogWithSpaces = [
      '  Task 1  ',
      'Task 2',
      '   ',
      '',
      'Task 3  ',
    ];
    const batches = chunkBacklog(backlogWithSpaces);
    const allTasks = batches.flatMap((b) => b.tasks);

    expect(allTasks).toEqual(['Task 1', 'Task 2', 'Task 3']);
    for (const task of allTasks) {
      expect(task).toBe(task.trim());
      expect(task.length).toBeGreaterThan(0);
    }
  });
});
