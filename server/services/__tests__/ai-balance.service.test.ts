/**
 * Unit tests for AI Balance Service (PR-49)
 *
 * Tests:
 * - estimateBalanceFromEvents calculates spend from events
 * - estimateBalanceFromEvents returns null balance when no limit
 * - estimateBalanceFromEvents calculates balance with limit
 * - getAiProviderBalance returns estimator result for provider without API
 * - getAiProviderBalance returns unknown for provider without events
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { db, initDB } from "@/server/db";
import { aiCostEvents } from "@/server/db/schema";
import { eq, and, gte } from "drizzle-orm";
import {
  estimateBalanceFromEvents,
  getAiProviderBalance,
  type BalanceSource,
} from "../ai/ai-balance.service";

describe("ai-balance.service", () => {
  beforeAll(() => {
    initDB();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.delete(aiCostEvents).where(eq(aiCostEvents.source, "test-balance"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("estimateBalanceFromEvents", () => {
    it("calculates spend from events in window", async () => {
      const now = new Date();
      const eventId1 = `test-balance-${Date.now()}-1`;
      const eventId2 = `test-balance-${Date.now()}-2`;

      // Insert test events
      await db.insert(aiCostEvents).values([
        {
          id: eventId1,
          source: "test-balance",
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
          estimatedCostUsd: 5.0,
        },
        {
          id: eventId2,
          source: "test-balance",
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
          estimatedCostUsd: 3.5,
        },
      ]);

      const result = await estimateBalanceFromEvents({
        provider: "anthropic",
        windowDays: 30,
        testSource: "test-balance",
      });

      expect(result.estimatedSpendUSD).toBeCloseTo(8.5, 2);
    });

    it("returns null balance when no monthly limit set", async () => {
      vi.stubEnv("ANTHROPIC_MONTHLY_LIMIT_USD", "");

      const result = await estimateBalanceFromEvents({
        provider: "anthropic",
        windowDays: 30,
        testSource: "test-balance",
      });

      expect(result.estimatedBalanceUSD).toBeNull();
    });

    it("calculates balance when monthly limit is set", async () => {
      vi.stubEnv("ANTHROPIC_MONTHLY_LIMIT_USD", "100");

      const eventId = `test-balance-${Date.now()}`;
      await db.insert(aiCostEvents).values({
        id: eventId,
        source: "test-balance",
        provider: "anthropic",
        estimatedCostUsd: 25.0,
      });

      const result = await estimateBalanceFromEvents({
        provider: "anthropic",
        windowDays: 30,
        testSource: "test-balance",
      });

      expect(result.estimatedSpendUSD).toBeCloseTo(25.0, 2);
      expect(result.estimatedBalanceUSD).toBeCloseTo(75.0, 2);
    });

    it("returns zero spend when no events exist", async () => {
      const result = await estimateBalanceFromEvents({
        provider: "anthropic",
        windowDays: 30,
        testSource: "test-balance-nonexistent",
      });

      expect(result.estimatedSpendUSD).toBe(0);
    });

    it("handles OpenAI provider with limit", async () => {
      vi.stubEnv("OPENAI_MONTHLY_LIMIT_USD", "50");

      const eventId = `test-balance-${Date.now()}`;
      await db.insert(aiCostEvents).values({
        id: eventId,
        source: "test-balance",
        provider: "openai",
        estimatedCostUsd: 10.0,
      });

      const result = await estimateBalanceFromEvents({
        provider: "openai",
        windowDays: 30,
        testSource: "test-balance",
      });

      expect(result.estimatedSpendUSD).toBeCloseTo(10.0, 2);
      expect(result.estimatedBalanceUSD).toBeCloseTo(40.0, 2);
    });
  });

  describe("getAiProviderBalance", () => {
    it("returns estimator source for provider without API balance", async () => {
      const eventId = `test-balance-${Date.now()}`;
      await db.insert(aiCostEvents).values({
        id: eventId,
        source: "test-balance",
        provider: "anthropic",
        estimatedCostUsd: 12.42,
      });

      const result = await getAiProviderBalance("anthropic", {
        testSource: "test-balance",
      });

      expect(result.provider).toBe("anthropic");
      expect(result.source).toBe("estimator");
      expect(result.estimatedSpendUSD).toBeCloseTo(12.42, 2);
    });

    it("returns unknown source when no events and no API", async () => {
      const result = await getAiProviderBalance("openai", {
        testSource: "test-balance-nonexistent",
      });

      expect(result.provider).toBe("openai");
      expect(result.source).toBe("unknown");
      expect(result.balanceUSD).toBeNull();
    });

    it("returns balanceUSD when limit is configured", async () => {
      vi.stubEnv("ANTHROPIC_MONTHLY_LIMIT_USD", "200");

      const eventId = `test-balance-${Date.now()}`;
      await db.insert(aiCostEvents).values({
        id: eventId,
        source: "test-balance",
        provider: "anthropic",
        estimatedCostUsd: 50.0,
      });

      const result = await getAiProviderBalance("anthropic", {
        testSource: "test-balance",
      });

      expect(result.balanceUSD).toBeCloseTo(150.0, 2);
      expect(result.estimatedSpendUSD).toBeCloseTo(50.0, 2);
      expect(result.source).toBe("estimator");
    });
  });
});
