/**
 * Mock Mode Gating Tests (PR-130)
 *
 * NEW CONTRACT (explicit flags only):
 * - Mock mode is ONLY enabled by:
 *   - VK_TEST_MODE=1
 *   - E2E_PROFILE=ci
 *   - E2E_PROFILE=local
 *
 * NOT triggered by:
 * - NODE_ENV=test (unit tests must be able to test real AI branches)
 * - CI=true (same reason)
 * - PLAYWRIGHT=1 alone (was already excluded)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isMockModeEnabled,
  getMockModeTriggers,
  getMockModeReason,
} from "../mock-mode";

describe("Mock Mode Gating (PR-130)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset all mock-related env vars
    delete process.env.CI;
    delete process.env.VK_TEST_MODE;
    delete process.env.E2E_PROFILE;
    delete process.env.PLAYWRIGHT;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("isMockModeEnabled()", () => {
    it("returns false in dev mode without any flags", () => {
      // CRITICAL: dev mode should NOT be mock
      expect(isMockModeEnabled()).toBe(false);
    });

    it("returns false when only PLAYWRIGHT=1 is set", () => {
      // CRITICAL: PLAYWRIGHT=1 alone should NOT trigger mock mode
      process.env.PLAYWRIGHT = "1";
      expect(isMockModeEnabled()).toBe(false);
    });

    // NEW: CI alone should NOT trigger mock mode
    it("returns false when only CI=true is set", () => {
      // CRITICAL: CI alone should NOT trigger mock mode
      // Unit tests run in CI and must be able to test real AI branches
      process.env.CI = "true";
      expect(isMockModeEnabled()).toBe(false);
    });

    // NEW: NODE_ENV=test should NOT trigger mock mode
    it("returns false when NODE_ENV=test (allows testing real AI branches)", () => {
      // CRITICAL: NODE_ENV=test should NOT trigger mock mode
      // Unit tests must be able to test both mock and real AI status logic
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      expect(isMockModeEnabled()).toBe(false);
    });

    it("returns true when VK_TEST_MODE=1", () => {
      process.env.VK_TEST_MODE = "1";
      expect(isMockModeEnabled()).toBe(true);
    });

    it("returns true when E2E_PROFILE=ci", () => {
      process.env.E2E_PROFILE = "ci";
      expect(isMockModeEnabled()).toBe(true);
    });

    it("returns true when E2E_PROFILE=local", () => {
      process.env.E2E_PROFILE = "local";
      expect(isMockModeEnabled()).toBe(true);
    });

    it("returns false when E2E_PROFILE has unknown value", () => {
      process.env.E2E_PROFILE = "production";
      expect(isMockModeEnabled()).toBe(false);
    });

    it("returns true when multiple explicit triggers are set", () => {
      process.env.VK_TEST_MODE = "1";
      process.env.E2E_PROFILE = "ci";
      expect(isMockModeEnabled()).toBe(true);
    });
  });

  describe("getMockModeTriggers()", () => {
    it("returns empty array when no triggers", () => {
      expect(getMockModeTriggers()).toEqual([]);
    });

    it("returns VK_TEST_MODE when VK_TEST_MODE=1", () => {
      process.env.VK_TEST_MODE = "1";
      expect(getMockModeTriggers()).toContain("VK_TEST_MODE");
    });

    it("returns E2E_PROFILE when E2E_PROFILE=ci", () => {
      process.env.E2E_PROFILE = "ci";
      expect(getMockModeTriggers()).toContain("E2E_PROFILE");
    });

    it("returns E2E_PROFILE when E2E_PROFILE=local", () => {
      process.env.E2E_PROFILE = "local";
      expect(getMockModeTriggers()).toContain("E2E_PROFILE");
    });

    // NEW: CI should NOT appear in triggers
    it("does NOT include CI even when CI=true", () => {
      process.env.CI = "true";
      expect(getMockModeTriggers()).not.toContain("CI");
    });

    // NEW: NODE_ENV_TEST should NOT appear in triggers
    it("does NOT include NODE_ENV_TEST even when NODE_ENV=test", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      expect(getMockModeTriggers()).not.toContain("NODE_ENV_TEST");
    });

    it("does NOT include PLAYWRIGHT", () => {
      process.env.PLAYWRIGHT = "1";
      expect(getMockModeTriggers()).not.toContain("PLAYWRIGHT");
    });

    it("returns multiple triggers when set", () => {
      process.env.VK_TEST_MODE = "1";
      process.env.E2E_PROFILE = "ci";
      const triggers = getMockModeTriggers();
      expect(triggers).toContain("VK_TEST_MODE");
      expect(triggers).toContain("E2E_PROFILE");
    });
  });

  describe("getMockModeReason()", () => {
    it("returns null when not in mock mode", () => {
      expect(getMockModeReason()).toBeNull();
    });

    it("returns VK_TEST_MODE=1 when VK_TEST_MODE is set", () => {
      process.env.VK_TEST_MODE = "1";
      expect(getMockModeReason()).toBe("VK_TEST_MODE=1");
    });

    it("returns E2E_PROFILE=ci when E2E_PROFILE=ci", () => {
      process.env.E2E_PROFILE = "ci";
      expect(getMockModeReason()).toBe("E2E_PROFILE=ci");
    });

    it("returns E2E_PROFILE=local when E2E_PROFILE=local", () => {
      process.env.E2E_PROFILE = "local";
      expect(getMockModeReason()).toBe("E2E_PROFILE=local");
    });

    // NEW: CI alone should return null (not a trigger)
    it("returns null when only CI=true (not a trigger)", () => {
      process.env.CI = "true";
      expect(getMockModeReason()).toBeNull();
    });

    it("returns combined reason when multiple triggers", () => {
      process.env.VK_TEST_MODE = "1";
      process.env.E2E_PROFILE = "ci";
      const reason = getMockModeReason();
      expect(reason).toContain("VK_TEST_MODE=1");
      expect(reason).toContain("E2E_PROFILE=ci");
    });
  });

  describe("E2E Test Scenario", () => {
    it("mock mode is enabled in E2E (VK_TEST_MODE + PLAYWRIGHT)", () => {
      // Simulates playwright.config.ts webServer env
      process.env.VK_TEST_MODE = "1";
      process.env.PLAYWRIGHT = "1";
      expect(isMockModeEnabled()).toBe(true);
    });

    it("mock mode is enabled in E2E with profile (E2E_PROFILE=ci)", () => {
      // Alternative: use E2E_PROFILE instead of VK_TEST_MODE
      process.env.E2E_PROFILE = "ci";
      expect(isMockModeEnabled()).toBe(true);
    });

    it("mock mode is enabled for local E2E (E2E_PROFILE=local)", () => {
      process.env.E2E_PROFILE = "local";
      expect(isMockModeEnabled()).toBe(true);
    });
  });

  describe("Dev Mode Scenario", () => {
    it("mock mode is disabled in clean dev", () => {
      // Simulates: npm run dev
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      expect(isMockModeEnabled()).toBe(false);
    });

    it("mock mode is disabled even with stray PLAYWRIGHT=1", () => {
      // Edge case: user accidentally runs with PLAYWRIGHT=1
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      process.env.PLAYWRIGHT = "1";
      expect(isMockModeEnabled()).toBe(false);
    });
  });

  describe("Unit Test Scenario (NODE_ENV=test)", () => {
    it("mock mode is disabled so tests can validate real AI logic", () => {
      // CRITICAL: Unit tests must be able to test both mock and real AI paths
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      expect(isMockModeEnabled()).toBe(false);
    });

    it("mock mode can be enabled explicitly in unit tests via VK_TEST_MODE", () => {
      // When a test WANTS mock mode, it sets VK_TEST_MODE=1 explicitly
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      process.env.VK_TEST_MODE = "1";
      expect(isMockModeEnabled()).toBe(true);
    });
  });

  describe("CI Scenario", () => {
    it("mock mode is disabled in CI by default (allows testing real AI logic)", () => {
      // CI runs unit tests - they need to test both paths
      process.env.CI = "true";
      expect(isMockModeEnabled()).toBe(false);
    });

    it("mock mode can be enabled in CI via VK_TEST_MODE", () => {
      // E2E in CI sets VK_TEST_MODE explicitly
      process.env.CI = "true";
      process.env.VK_TEST_MODE = "1";
      expect(isMockModeEnabled()).toBe(true);
    });

    it("mock mode can be enabled in CI via E2E_PROFILE", () => {
      process.env.CI = "true";
      process.env.E2E_PROFILE = "ci";
      expect(isMockModeEnabled()).toBe(true);
    });
  });
});
