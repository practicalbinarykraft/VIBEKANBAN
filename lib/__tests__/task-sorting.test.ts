/**
 * Unit tests for task sorting helper
 *
 * Tasks should be sorted by order ASC.
 * Tasks with null/undefined order go to the end.
 */

import { describe, it, expect } from 'vitest';
import { sortTasksByOrder, compareTaskOrder } from '../task-sorting';

describe('task-sorting', () => {
  describe('compareTaskOrder', () => {
    it('returns negative when a.order < b.order', () => {
      expect(compareTaskOrder({ order: 1 }, { order: 2 })).toBeLessThan(0);
    });

    it('returns positive when a.order > b.order', () => {
      expect(compareTaskOrder({ order: 5 }, { order: 2 })).toBeGreaterThan(0);
    });

    it('returns 0 when orders are equal', () => {
      expect(compareTaskOrder({ order: 3 }, { order: 3 })).toBe(0);
    });

    it('puts null order after numeric order', () => {
      expect(compareTaskOrder({ order: null }, { order: 1 })).toBeGreaterThan(0);
    });

    it('puts undefined order after numeric order', () => {
      expect(compareTaskOrder({ order: undefined }, { order: 1 })).toBeGreaterThan(0);
    });

    it('puts numeric order before null order', () => {
      expect(compareTaskOrder({ order: 1 }, { order: null })).toBeLessThan(0);
    });

    it('returns 0 when both orders are null', () => {
      expect(compareTaskOrder({ order: null }, { order: null })).toBe(0);
    });

    it('returns 0 when both orders are undefined', () => {
      expect(compareTaskOrder({ order: undefined }, { order: undefined })).toBe(0);
    });

    it('treats 0 as valid order (before null)', () => {
      expect(compareTaskOrder({ order: 0 }, { order: null })).toBeLessThan(0);
    });
  });

  describe('sortTasksByOrder', () => {
    it('sorts tasks by order ascending', () => {
      const tasks = [
        { id: 'c', order: 3 },
        { id: 'a', order: 1 },
        { id: 'b', order: 2 },
      ];
      const sorted = sortTasksByOrder(tasks);
      expect(sorted.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    });

    it('does not mutate original array', () => {
      const tasks = [
        { id: 'b', order: 2 },
        { id: 'a', order: 1 },
      ];
      const sorted = sortTasksByOrder(tasks);
      expect(tasks[0].id).toBe('b'); // Original unchanged
      expect(sorted[0].id).toBe('a'); // Sorted is new array
    });

    it('puts null orders at the end', () => {
      const tasks = [
        { id: 'null', order: null },
        { id: 'one', order: 1 },
        { id: 'two', order: 2 },
      ];
      const sorted = sortTasksByOrder(tasks);
      expect(sorted.map((t) => t.id)).toEqual(['one', 'two', 'null']);
    });

    it('puts undefined orders at the end', () => {
      const tasks = [
        { id: 'undef', order: undefined },
        { id: 'one', order: 1 },
      ];
      const sorted = sortTasksByOrder(tasks);
      expect(sorted.map((t) => t.id)).toEqual(['one', 'undef']);
    });

    it('handles empty array', () => {
      expect(sortTasksByOrder([])).toEqual([]);
    });

    it('handles single element', () => {
      const tasks = [{ id: 'a', order: 1 }];
      expect(sortTasksByOrder(tasks)).toEqual([{ id: 'a', order: 1 }]);
    });

    it('preserves relative order of equal-order tasks (stable sort)', () => {
      const tasks = [
        { id: 'first-null', order: null },
        { id: 'second-null', order: null },
        { id: 'one', order: 1 },
      ];
      const sorted = sortTasksByOrder(tasks);
      // Both nulls should be at the end, in their original order
      expect(sorted[1].id).toBe('first-null');
      expect(sorted[2].id).toBe('second-null');
    });

    it('works with mixed order values', () => {
      const tasks = [
        { id: 'null1', order: null },
        { id: 'three', order: 3 },
        { id: 'one', order: 1 },
        { id: 'null2', order: null },
        { id: 'two', order: 2 },
      ];
      const sorted = sortTasksByOrder(tasks);
      expect(sorted.map((t) => t.id)).toEqual(['one', 'two', 'three', 'null1', 'null2']);
    });
  });
});
