/**
 * Unit tests for plan-to-tasks converter
 *
 * Tests:
 * - 3 steps → 3 tasks
 * - empty → empty
 * - truncates long title (>80 chars)
 * - determinism (same input → same output)
 */

import { describe, it, expect } from 'vitest';
import { planToTasks } from '../plan-to-tasks';

describe('planToTasks', () => {
  const projectId = 'test-project-123';

  describe('basic conversion', () => {
    it('converts 3 plan steps to 3 tasks', () => {
      const planSteps = [
        'Setup project structure',
        'Implement authentication',
        'Add unit tests',
      ];

      const result = planToTasks({ projectId, planSteps });

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('Setup project structure');
      expect(result[1].title).toBe('Implement authentication');
      expect(result[2].title).toBe('Add unit tests');
    });

    it('returns empty array for empty input', () => {
      const result = planToTasks({ projectId, planSteps: [] });

      expect(result).toEqual([]);
    });

    it('includes full step text in description', () => {
      const planSteps = ['Implement user login with OAuth2'];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].description).toContain('Implement user login with OAuth2');
    });
  });

  describe('title truncation', () => {
    it('truncates title longer than 80 characters', () => {
      const longStep = 'A'.repeat(100); // 100 chars
      const planSteps = [longStep];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].title.length).toBeLessThanOrEqual(80);
      expect(result[0].title).toMatch(/\.\.\.$/); // ends with ...
    });

    it('keeps title intact if exactly 80 characters', () => {
      const exactStep = 'A'.repeat(80);
      const planSteps = [exactStep];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].title).toBe(exactStep);
      expect(result[0].title.length).toBe(80);
    });

    it('preserves full text in description even if title truncated', () => {
      const longStep = 'B'.repeat(100);
      const planSteps = [longStep];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].description).toContain(longStep);
    });
  });

  describe('determinism', () => {
    it('produces identical output for identical input', () => {
      const planSteps = [
        'Step one',
        'Step two',
        'Step three',
      ];

      const result1 = planToTasks({ projectId, planSteps });
      const result2 = planToTasks({ projectId, planSteps });

      expect(result1).toEqual(result2);
    });

    it('produces identical output across multiple calls', () => {
      const planSteps = ['Deterministic step'];
      const results: ReturnType<typeof planToTasks>[] = [];

      for (let i = 0; i < 5; i++) {
        results.push(planToTasks({ projectId, planSteps }));
      }

      // All results should be identical
      results.forEach((result) => {
        expect(result).toEqual(results[0]);
      });
    });
  });

  describe('edge cases', () => {
    it('handles whitespace-only steps', () => {
      const planSteps = ['   ', 'Valid step', '\t\n'];

      const result = planToTasks({ projectId, planSteps });

      // Should filter out whitespace-only steps
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Valid step');
    });

    it('trims whitespace from steps', () => {
      const planSteps = ['  Step with spaces  '];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].title).toBe('Step with spaces');
    });
  });
});
