/**
 * E2E Profile Tests (PR-129)
 *
 * Tests for E2E profile detection to support local vs CI configuration.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getE2EProfile, type E2EProfile } from "../e2e-profile";

describe("getE2EProfile", () => {
  const originalEnv = process.env.E2E_PROFILE;

  beforeEach(() => {
    delete process.env.E2E_PROFILE;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.E2E_PROFILE = originalEnv;
    } else {
      delete process.env.E2E_PROFILE;
    }
  });

  it("returns 'local' by default when E2E_PROFILE is not set", () => {
    expect(getE2EProfile()).toBe("local");
  });

  it("returns 'ci' when E2E_PROFILE=ci", () => {
    process.env.E2E_PROFILE = "ci";
    expect(getE2EProfile()).toBe("ci");
  });

  it("returns 'local' when E2E_PROFILE=local", () => {
    process.env.E2E_PROFILE = "local";
    expect(getE2EProfile()).toBe("local");
  });

  it("returns 'local' for unknown values (falls back to default)", () => {
    process.env.E2E_PROFILE = "unknown";
    expect(getE2EProfile()).toBe("local");
  });

  it("does NOT auto-detect from process.env.CI", () => {
    // Even if CI=true, without explicit E2E_PROFILE, should return 'local'
    process.env.CI = "true";
    expect(getE2EProfile()).toBe("local");
    delete process.env.CI;
  });
});
