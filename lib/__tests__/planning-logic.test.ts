/**
 * Unit tests for planning logic (determineProductMode)
 *
 * Tests the deterministic mode selection:
 * - "MVP" or "быстро" in ideaText → PLAN mode
 * - Otherwise → QUESTIONS mode
 */

import { describe, it, expect } from 'vitest';
import { determineProductMode } from '../planning-logic';

describe('determineProductMode', () => {
  describe('returns PLAN mode', () => {
    it('when ideaText contains "MVP"', () => {
      expect(determineProductMode('Build an MVP for users')).toBe('PLAN');
    });

    it('when ideaText contains "mvp" (case insensitive)', () => {
      expect(determineProductMode('create mvp version')).toBe('PLAN');
    });

    it('when ideaText contains "быстро"', () => {
      expect(determineProductMode('Сделаем быстро')).toBe('PLAN');
    });

    it('when ideaText contains "Быстро" (case insensitive)', () => {
      expect(determineProductMode('Быстро создать приложение')).toBe('PLAN');
    });

    it('when ideaText contains both MVP and быстро', () => {
      expect(determineProductMode('MVP быстро')).toBe('PLAN');
    });
  });

  describe('returns QUESTIONS mode', () => {
    it('when ideaText does not contain MVP or быстро', () => {
      expect(determineProductMode('Хочу приложение для бюджета')).toBe('QUESTIONS');
    });

    it('when ideaText is a generic idea', () => {
      expect(determineProductMode('Build a user authentication system')).toBe('QUESTIONS');
    });

    it('when ideaText is empty', () => {
      expect(determineProductMode('')).toBe('QUESTIONS');
    });

    it('when ideaText contains similar but not exact words', () => {
      // "MVPx" should not match "MVP"
      expect(determineProductMode('MVPx is not MVP')).toBe('PLAN'); // contains MVP
    });
  });
});
