/**
 * Mock Mode Gating Tests (PR-130)
 *
 * Verifies that mock mode is ONLY enabled by explicit flags,
 * NOT by PLAYWRIGHT=1 alone.
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
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("isMockModeEnabled()", () => {
    it("returns false in dev mode without any flags", () => {
      // CRITICAL: This is the key test - dev mode should NOT be mock
      expect(isMockModeEnabled()).toBe(false);
    });

    it("returns false when only PLAYWRIGHT=1 is set", () => {
      // CRITICAL: PLAYWRIGHT=1 alone should NOT trigger mock mode
      process.env.PLAYWRIGHT = "1";
      expect(isMockModeEnabled()).toBe(false);
    });

    it("returns true when CI=true", () => {
      process.env.CI = "true";
      expect(isMockModeEnabled()).toBe(true);
    });

    it("returns true when VK_TEST_MODE=1", () => {
      process.env.VK_TEST_MODE = "1";
      expect(isMockModeEnabled()).toBe(true);
    });

    it("returns true when E2E_PROFILE=ci", () => {
      process.env.E2E_PROFILE = "ci";
      expect(isMockModeEnabled()).toBe(true);
    });

    it("returns true when NODE_ENV=test", () => {
      process.env.NODE_ENV = "test";
      expect(isMockModeEnabled()).toBe(true);
    });

    it("returns true when multiple triggers are set", () => {
      process.env.CI = "true";
      process.env.VK_TEST_MODE = "1";
      expect(isMockModeEnabled()).toBe(true);
    });
  });

  describe("getMockModeTriggers()", () => {
    it("returns empty array when no triggers", () => {
      expect(getMockModeTriggers()).toEqual([]);
    });

    it("returns CI when CI=true", () => {
      process.env.CI = "true";
      expect(getMockModeTriggers()).toContain("CI");
    });

    it("returns VK_TEST_MODE when VK_TEST_MODE=1", () => {
      process.env.VK_TEST_MODE = "1";
      expect(getMockModeTriggers()).toContain("VK_TEST_MODE");
    });

    it("returns E2E_PROFILE when E2E_PROFILE=ci", () => {
      process.env.E2E_PROFILE = "ci";
      expect(getMockModeTriggers()).toContain("E2E_PROFILE");
    });

    it("returns NODE_ENV_TEST when NODE_ENV=test", () => {
      process.env.NODE_ENV = "test";
      expect(getMockModeTriggers()).toContain("NODE_ENV_TEST");
    });

    it("does NOT include PLAYWRIGHT", () => {
      process.env.PLAYWRIGHT = "1";
      expect(getMockModeTriggers()).not.toContain("PLAYWRIGHT");
    });

    it("returns multiple triggers when set", () => {
      process.env.CI = "true";
      process.env.VK_TEST_MODE = "1";
      const triggers = getMockModeTriggers();
      expect(triggers).toContain("CI");
      expect(triggers).toContain("VK_TEST_MODE");
    });
  });

  describe("getMockModeReason()", () => {
    it("returns null when not in mock mode", () => {
      expect(getMockModeReason()).toBeNull();
    });

    it("returns CI=true when CI is set", () => {
      process.env.CI = "true";
      expect(getMockModeReason()).toBe("CI=true");
    });

    it("returns VK_TEST_MODE=1 when VK_TEST_MODE is set", () => {
      process.env.VK_TEST_MODE = "1";
      expect(getMockModeReason()).toBe("VK_TEST_MODE=1");
    });

    it("returns combined reason when multiple triggers", () => {
      process.env.CI = "true";
      process.env.VK_TEST_MODE = "1";
      const reason = getMockModeReason();
      expect(reason).toContain("CI=true");
      expect(reason).toContain("VK_TEST_MODE=1");
    });
  });

  describe("E2E Test Scenario", () => {
    it("mock mode is enabled in E2E (VK_TEST_MODE + PLAYWRIGHT)", () => {
      // Simulates playwright.config.ts webServer env
      process.env.VK_TEST_MODE = "1";
      process.env.PLAYWRIGHT = "1";
      expect(isMockModeEnabled()).toBe(true);
    });

    it("mock mode is enabled in CI (CI + VK_TEST_MODE)", () => {
      // Simulates GitHub Actions
      process.env.CI = "true";
      process.env.VK_TEST_MODE = "1";
      expect(isMockModeEnabled()).toBe(true);
    });
  });

  describe("Dev Mode Scenario", () => {
    it("mock mode is disabled in clean dev", () => {
      // Simulates: npm run dev
      process.env.NODE_ENV = "development";
      expect(isMockModeEnabled()).toBe(false);
    });

    it("mock mode is disabled even with stray PLAYWRIGHT=1", () => {
      // Edge case: user accidentally runs with PLAYWRIGHT=1
      process.env.NODE_ENV = "development";
      process.env.PLAYWRIGHT = "1";
      expect(isMockModeEnabled()).toBe(false);
    });
  });
});
