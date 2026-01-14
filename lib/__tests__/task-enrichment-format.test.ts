/**
 * Unit tests for task-enrichment-format helper
 *
 * Tests for UI formatting functions:
 * - formatEstimate: S/M/L to readable labels
 * - formatPriority: P1/P2/P3 to readable labels
 * - parseTags: safe JSON parsing of tags string
 */

import { describe, it, expect } from 'vitest';
import {
  formatEstimate,
  formatPriority,
  parseTags,
  getPriorityColor,
  getEstimateColor,
} from '../task-enrichment-format';

describe('task-enrichment-format', () => {
  describe('formatEstimate', () => {
    it('returns "S" for small estimate', () => {
      expect(formatEstimate('S')).toBe('S');
    });

    it('returns "M" for medium estimate', () => {
      expect(formatEstimate('M')).toBe('M');
    });

    it('returns "L" for large estimate', () => {
      expect(formatEstimate('L')).toBe('L');
    });

    it('returns "—" for null', () => {
      expect(formatEstimate(null)).toBe('—');
    });

    it('returns "—" for undefined', () => {
      expect(formatEstimate(undefined)).toBe('—');
    });

    it('returns "—" for empty string', () => {
      expect(formatEstimate('')).toBe('—');
    });
  });

  describe('formatPriority', () => {
    it('returns "P1" for high priority', () => {
      expect(formatPriority('P1')).toBe('P1');
    });

    it('returns "P2" for medium priority', () => {
      expect(formatPriority('P2')).toBe('P2');
    });

    it('returns "P3" for low priority', () => {
      expect(formatPriority('P3')).toBe('P3');
    });

    it('returns "—" for null', () => {
      expect(formatPriority(null)).toBe('—');
    });

    it('returns "—" for undefined', () => {
      expect(formatPriority(undefined)).toBe('—');
    });

    it('returns "—" for empty string', () => {
      expect(formatPriority('')).toBe('—');
    });
  });

  describe('parseTags', () => {
    it('parses valid JSON array', () => {
      expect(parseTags('["backend", "frontend"]')).toEqual(['backend', 'frontend']);
    });

    it('parses empty JSON array', () => {
      expect(parseTags('[]')).toEqual([]);
    });

    it('parses single tag array', () => {
      expect(parseTags('["infra"]')).toEqual(['infra']);
    });

    it('returns empty array for null', () => {
      expect(parseTags(null)).toEqual([]);
    });

    it('returns empty array for undefined', () => {
      expect(parseTags(undefined)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(parseTags('')).toEqual([]);
    });

    it('returns empty array for invalid JSON', () => {
      expect(parseTags('not json')).toEqual([]);
    });

    it('returns empty array for non-array JSON', () => {
      expect(parseTags('{"key": "value"}')).toEqual([]);
    });

    it('returns empty array for JSON number', () => {
      expect(parseTags('123')).toEqual([]);
    });
  });

  describe('getPriorityColor', () => {
    it('returns red color class for P1', () => {
      expect(getPriorityColor('P1')).toBe('text-red-500');
    });

    it('returns yellow color class for P2', () => {
      expect(getPriorityColor('P2')).toBe('text-yellow-500');
    });

    it('returns green color class for P3', () => {
      expect(getPriorityColor('P3')).toBe('text-green-500');
    });

    it('returns muted color for null', () => {
      expect(getPriorityColor(null)).toBe('text-muted-foreground');
    });

    it('returns muted color for undefined', () => {
      expect(getPriorityColor(undefined)).toBe('text-muted-foreground');
    });
  });

  describe('getEstimateColor', () => {
    it('returns green color class for S', () => {
      expect(getEstimateColor('S')).toBe('text-green-500');
    });

    it('returns yellow color class for M', () => {
      expect(getEstimateColor('M')).toBe('text-yellow-500');
    });

    it('returns red color class for L', () => {
      expect(getEstimateColor('L')).toBe('text-red-500');
    });

    it('returns muted color for null', () => {
      expect(getEstimateColor(null)).toBe('text-muted-foreground');
    });

    it('returns muted color for undefined', () => {
      expect(getEstimateColor(undefined)).toBe('text-muted-foreground');
    });
  });
});
