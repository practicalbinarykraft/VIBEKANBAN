/**
 * Unit tests for task-db-mapper
 *
 * Tests the pure function that maps TaskDefinition to DB insert format.
 * Verifies correct mapping of all enrichment fields.
 */

import { describe, it, expect } from 'vitest';
import { toDbTaskInsert } from '../task-db-mapper';
import type { TaskDefinition } from '../plan-to-tasks';

describe('toDbTaskInsert', () => {
  const baseTaskDef: TaskDefinition = {
    title: 'Setup project structure',
    description: 'Initialize the project with proper folder layout',
    order: 1,
    estimate: 'M',
    priority: 'P1',
    tags: ['backend', 'infra'],
  };

  it('maps title from TaskDefinition', () => {
    const result = toDbTaskInsert(baseTaskDef);
    expect(result.title).toBe('Setup project structure');
  });

  it('maps description from TaskDefinition', () => {
    const result = toDbTaskInsert(baseTaskDef);
    expect(result.description).toContain('Initialize the project with proper folder layout');
  });

  it('maps order from TaskDefinition', () => {
    const result = toDbTaskInsert(baseTaskDef);
    expect(result.order).toBe(1);
  });

  it('maps estimate correctly (S | M | L)', () => {
    const resultM = toDbTaskInsert({ ...baseTaskDef, estimate: 'M' });
    expect(resultM.estimate).toBe('M');

    const resultS = toDbTaskInsert({ ...baseTaskDef, estimate: 'S' });
    expect(resultS.estimate).toBe('S');

    const resultL = toDbTaskInsert({ ...baseTaskDef, estimate: 'L' });
    expect(resultL.estimate).toBe('L');
  });

  it('maps priority correctly (P1 | P2 | P3)', () => {
    const resultP1 = toDbTaskInsert({ ...baseTaskDef, priority: 'P1' });
    expect(resultP1.priority).toBe('P1');

    const resultP2 = toDbTaskInsert({ ...baseTaskDef, priority: 'P2' });
    expect(resultP2.priority).toBe('P2');

    const resultP3 = toDbTaskInsert({ ...baseTaskDef, priority: 'P3' });
    expect(resultP3.priority).toBe('P3');
  });

  it('serializes tags array as JSON string', () => {
    const result = toDbTaskInsert(baseTaskDef);
    expect(result.tags).toBe('["backend","infra"]');
  });

  it('handles empty tags array → "[]"', () => {
    const taskWithNoTags: TaskDefinition = {
      ...baseTaskDef,
      tags: [],
    };
    const result = toDbTaskInsert(taskWithNoTags);
    expect(result.tags).toBe('[]');
  });

  it('sets status to "todo"', () => {
    const result = toDbTaskInsert(baseTaskDef);
    expect(result.status).toBe('todo');
  });

  it('returns complete insert object with all fields', () => {
    const result = toDbTaskInsert(baseTaskDef);

    expect(result).toEqual({
      title: 'Setup project structure',
      description: expect.stringContaining('Initialize the project'),
      order: 1,
      estimate: 'M',
      priority: 'P1',
      tags: '["backend","infra"]',
      status: 'todo',
    });
  });

  it('adds enrichment marker to description', () => {
    const result = toDbTaskInsert(baseTaskDef);
    // Marker format: [P1][M][backend,infra]
    expect(result.description).toMatch(/^\[P1\]\[M\]\[backend,infra\]/);
  });

  it('handles single tag in marker', () => {
    const taskWithOneTag: TaskDefinition = {
      ...baseTaskDef,
      tags: ['frontend'],
    };
    const result = toDbTaskInsert(taskWithOneTag);
    expect(result.description).toMatch(/^\[P1\]\[M\]\[frontend\]/);
  });

  it('handles no tags in marker', () => {
    const taskWithNoTags: TaskDefinition = {
      ...baseTaskDef,
      tags: [],
    };
    const result = toDbTaskInsert(taskWithNoTags);
    expect(result.description).toMatch(/^\[P1\]\[M\]\[\]/);
  });
});
