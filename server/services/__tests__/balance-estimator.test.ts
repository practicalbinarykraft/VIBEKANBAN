/**
 * TDD tests for balance-estimator.ts (PR-52)
 *
 * Tests:
 * - Spend sum from ai_cost_events
 * - Remaining balance calculation (limit - spend)
 * - Handles no limit (remaining = null)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/server/db";
import { initDB } from "@/server/db";
import { aiCostEvents } from "@/server/db/schema";
import crypto from "crypto";
import {
  estimateProviderBalance,
  type EstimateResult,
} from "../providers/balance-estimator";

describe("balance-estimator", () => {
  const originalEnv = { ...process.env };
  let testSource: string;

  beforeEach(() => {
    // Generate unique testSource per test to ensure isolation
    testSource = `test-estimator-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    initDB();
    delete process.env.ANTHROPIC_MONTHLY_LIMIT_USD;
    delete process.env.OPENAI_MONTHLY_LIMIT_USD;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function insertCostEvent(provider: string, costUsd: number) {
    await db.insert(aiCostEvents).values({
      id: crypto.randomUUID(),
      source: testSource,
      provider,
      estimatedCostUsd: costUsd,
      createdAt: new Date(),
    });
  }

  describe("estimateProviderBalance", () => {
    it("returns zero spend when no events exist", async () => {
      const result = await estimateProviderBalance("anthropic", {
        testSource: `no-events-${Date.now()}`,
      });

      expect(result.spendUsd).toBe(0);
      expect(result.remainingUsd).toBeNull();
    });

    it("calculates spend from ai_cost_events", async () => {
      await insertCostEvent("anthropic", 1.5);
      await insertCostEvent("anthropic", 2.5);
      await insertCostEvent("anthropic", 1.0);

      const result = await estimateProviderBalance("anthropic", {
        testSource,
      });

      expect(result.spendUsd).toBe(5.0);
    });

    it("filters by provider - only counts matching provider", async () => {
      await insertCostEvent("anthropic", 3.0);
      await insertCostEvent("openai", 7.0);

      const anthropicResult = await estimateProviderBalance("anthropic", {
        testSource,
      });
      const openaiResult = await estimateProviderBalance("openai", {
        testSource,
      });

      expect(anthropicResult.spendUsd).toBe(3.0);
      expect(openaiResult.spendUsd).toBe(7.0);
    });

    it("calculates remaining when limit is set", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "10";
      await insertCostEvent("anthropic", 3.0);

      const result = await estimateProviderBalance("anthropic", {
        testSource,
      });

      expect(result.spendUsd).toBe(3.0);
      expect(result.remainingUsd).toBe(7.0); // 10 - 3
    });

    it("returns null remaining when no limit set", async () => {
      await insertCostEvent("anthropic", 5.0);

      const result = await estimateProviderBalance("anthropic", {
        testSource,
      });

      expect(result.spendUsd).toBe(5.0);
      expect(result.remainingUsd).toBeNull();
    });

    it("handles negative remaining (over budget)", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "5";
      await insertCostEvent("anthropic", 8.0);

      const result = await estimateProviderBalance("anthropic", {
        testSource,
      });

      expect(result.spendUsd).toBe(8.0);
      expect(result.remainingUsd).toBe(-3.0); // 5 - 8
    });

    it("respects windowDays parameter", async () => {
      // Insert event "40 days ago" (outside 30-day window)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);

      await db.insert(aiCostEvents).values({
        id: crypto.randomUUID(),
        source: testSource,
        provider: "anthropic",
        estimatedCostUsd: 100.0,
        createdAt: oldDate,
      });

      // Insert recent event
      await insertCostEvent("anthropic", 5.0);

      const result = await estimateProviderBalance("anthropic", {
        testSource,
        windowDays: 30,
      });

      expect(result.spendUsd).toBe(5.0); // Old event excluded
    });

    it("uses openai env var for openai provider", async () => {
      process.env.OPENAI_MONTHLY_LIMIT_USD = "20";
      await insertCostEvent("openai", 5.0);

      const result = await estimateProviderBalance("openai", {
        testSource,
      });

      expect(result.spendUsd).toBe(5.0);
      expect(result.remainingUsd).toBe(15.0); // 20 - 5
    });
  });
});
