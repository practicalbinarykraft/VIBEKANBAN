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

  describe('order field', () => {
    it('assigns order starting from 1', () => {
      const planSteps = ['First', 'Second', 'Third'];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].order).toBe(1);
      expect(result[1].order).toBe(2);
      expect(result[2].order).toBe(3);
    });

    it('order is strictly increasing', () => {
      const planSteps = ['A', 'B', 'C', 'D', 'E'];

      const result = planToTasks({ projectId, planSteps });

      for (let i = 1; i < result.length; i++) {
        expect(result[i].order).toBeGreaterThan(result[i - 1].order);
      }
    });
  });

  describe('estimate field', () => {
    it('estimate is valid enum value', () => {
      const planSteps = ['Short', 'Medium length step here', 'A'.repeat(100)];

      const result = planToTasks({ projectId, planSteps });

      result.forEach((task) => {
        expect(['S', 'M', 'L']).toContain(task.estimate);
      });
    });

    it('short steps (<30 chars) get S estimate', () => {
      const planSteps = ['Setup project']; // 13 chars

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].estimate).toBe('S');
    });

    it('medium steps (30-80 chars) get M estimate', () => {
      const planSteps = ['Implement user authentication with OAuth2']; // 42 chars

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].estimate).toBe('M');
    });

    it('long steps (>80 chars) get L estimate', () => {
      const planSteps = ['A'.repeat(81)];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].estimate).toBe('L');
    });

    it('boundary: exactly 30 chars is M', () => {
      const planSteps = ['A'.repeat(30)];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].estimate).toBe('M');
    });

    it('boundary: exactly 80 chars is M', () => {
      const planSteps = ['A'.repeat(80)];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].estimate).toBe('M');
    });
  });

  describe('priority field', () => {
    it('priority is valid enum value', () => {
      const planSteps = ['A', 'B', 'C'];

      const result = planToTasks({ projectId, planSteps });

      result.forEach((task) => {
        expect(['P1', 'P2', 'P3']).toContain(task.priority);
      });
    });

    it('single task gets P1', () => {
      const planSteps = ['Only task'];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].priority).toBe('P1');
    });

    it('two tasks: first=P1, second=P3', () => {
      const planSteps = ['First', 'Second'];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].priority).toBe('P1');
      expect(result[1].priority).toBe('P3');
    });

    it('three tasks: first=P1, middle=P2, last=P3', () => {
      const planSteps = ['First', 'Middle', 'Last'];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].priority).toBe('P1');
      expect(result[1].priority).toBe('P2');
      expect(result[2].priority).toBe('P3');
    });

    it('five tasks: first=P1, middle=P2, last=P3', () => {
      const planSteps = ['A', 'B', 'C', 'D', 'E'];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].priority).toBe('P1'); // i=1
      expect(result[1].priority).toBe('P2'); // i=2
      expect(result[2].priority).toBe('P2'); // i=3
      expect(result[3].priority).toBe('P2'); // i=4
      expect(result[4].priority).toBe('P3'); // i=5=N
    });
  });

  describe('tags field', () => {
    it('detects backend tags', () => {
      const planSteps = ['Create API endpoint for auth'];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].tags).toContain('backend');
    });

    it('detects frontend tags', () => {
      const planSteps = ['Build UI component for page'];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].tags).toContain('frontend');
    });

    it('detects infra tags', () => {
      const planSteps = ['Setup Docker and CI pipeline'];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].tags).toContain('infra');
    });

    it('detects design tags', () => {
      const planSteps = ['Create UX mockup for design'];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].tags).toContain('design');
    });

    it('returns empty tags for generic steps', () => {
      const planSteps = ['Do something generic'];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].tags).toEqual([]);
    });

    it('detects multiple tags and returns sorted unique array', () => {
      const planSteps = ['Create API component with UI'];

      const result = planToTasks({ projectId, planSteps });

      // Should have both backend (api) and frontend (component, ui)
      expect(result[0].tags).toContain('backend');
      expect(result[0].tags).toContain('frontend');
      // Should be sorted
      expect(result[0].tags).toEqual([...result[0].tags].sort());
      // Should be unique (no duplicates)
      expect(new Set(result[0].tags).size).toBe(result[0].tags.length);
    });

    it('tags are always sorted alphabetically', () => {
      const planSteps = ['Design UI with Docker deploy'];

      const result = planToTasks({ projectId, planSteps });

      expect(result[0].tags).toEqual([...result[0].tags].sort());
    });
  });
});
