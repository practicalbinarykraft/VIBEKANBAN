/**
 * TDD tests for ai-usage-aggregates.service.ts (PR-57)
 *
 * Tests:
 * - Empty table
 * - Multiple days
 * - Multiple providers
 * - Mixed providers + days
 * - Correct GROUP BY
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db, initDB } from "@/server/db";
import { aiCostEvents } from "@/server/db/schema";
import crypto from "crypto";
import { getAiUsageByDay, getAiUsageByProvider } from "../ai/ai-usage-aggregates.service";

describe("ai-usage-aggregates.service", () => {
  let testSource: string;

  beforeEach(() => {
    testSource = `test-aggregates-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    initDB();
  });

  async function insertEvent(opts: {
    provider: string;
    costUsd: number;
    date: Date;
  }) {
    await db.insert(aiCostEvents).values({
      id: crypto.randomUUID(),
      source: testSource,
      provider: opts.provider,
      estimatedCostUsd: opts.costUsd,
      createdAt: opts.date,
    });
  }

  describe("getAiUsageByDay", () => {
    it("returns empty array when no events exist", async () => {
      const result = await getAiUsageByDay({ testSource: `empty-${Date.now()}` });
      expect(result).toEqual([]);
    });

    it("groups events by day", async () => {
      const day1 = new Date("2026-01-18T10:00:00Z");
      const day2 = new Date("2026-01-19T14:00:00Z");

      await insertEvent({ provider: "anthropic", costUsd: 1.0, date: day1 });
      await insertEvent({ provider: "anthropic", costUsd: 0.5, date: day1 });
      await insertEvent({ provider: "anthropic", costUsd: 2.0, date: day2 });

      const result = await getAiUsageByDay({ testSource });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ date: "2026-01-18", totalUsd: 1.5 });
      expect(result[1]).toEqual({ date: "2026-01-19", totalUsd: 2.0 });
    });

    it("sorts by date ASC", async () => {
      const day1 = new Date("2026-01-15T10:00:00Z");
      const day2 = new Date("2026-01-20T10:00:00Z");
      const day3 = new Date("2026-01-17T10:00:00Z");

      await insertEvent({ provider: "anthropic", costUsd: 1.0, date: day2 });
      await insertEvent({ provider: "anthropic", costUsd: 2.0, date: day1 });
      await insertEvent({ provider: "anthropic", costUsd: 3.0, date: day3 });

      const result = await getAiUsageByDay({ testSource });

      expect(result[0].date).toBe("2026-01-15");
      expect(result[1].date).toBe("2026-01-17");
      expect(result[2].date).toBe("2026-01-20");
    });

    it("sums across multiple providers on same day", async () => {
      const day = new Date("2026-01-18T10:00:00Z");

      await insertEvent({ provider: "anthropic", costUsd: 1.0, date: day });
      await insertEvent({ provider: "openai", costUsd: 2.0, date: day });

      const result = await getAiUsageByDay({ testSource });

      expect(result).toHaveLength(1);
      expect(result[0].totalUsd).toBe(3.0);
    });
  });

  describe("getAiUsageByProvider", () => {
    it("returns empty array when no events exist", async () => {
      const result = await getAiUsageByProvider({ testSource: `empty-${Date.now()}` });
      expect(result).toEqual([]);
    });

    it("groups events by provider", async () => {
      const day = new Date("2026-01-18T10:00:00Z");

      await insertEvent({ provider: "anthropic", costUsd: 1.0, date: day });
      await insertEvent({ provider: "anthropic", costUsd: 0.5, date: day });
      await insertEvent({ provider: "openai", costUsd: 2.0, date: day });

      const result = await getAiUsageByProvider({ testSource });

      expect(result).toHaveLength(2);
      // Sorted DESC by totalUsd
      expect(result[0]).toEqual({ provider: "openai", totalUsd: 2.0 });
      expect(result[1]).toEqual({ provider: "anthropic", totalUsd: 1.5 });
    });

    it("sorts by totalUsd DESC", async () => {
      const day = new Date("2026-01-18T10:00:00Z");

      await insertEvent({ provider: "openai", costUsd: 0.5, date: day });
      await insertEvent({ provider: "anthropic", costUsd: 5.0, date: day });
      await insertEvent({ provider: "mock", costUsd: 1.0, date: day });

      const result = await getAiUsageByProvider({ testSource });

      expect(result[0].provider).toBe("anthropic");
      expect(result[0].totalUsd).toBe(5.0);
      expect(result[1].provider).toBe("mock");
      expect(result[1].totalUsd).toBe(1.0);
      expect(result[2].provider).toBe("openai");
      expect(result[2].totalUsd).toBe(0.5);
    });

    it("sums across multiple days for same provider", async () => {
      const day1 = new Date("2026-01-18T10:00:00Z");
      const day2 = new Date("2026-01-19T10:00:00Z");

      await insertEvent({ provider: "anthropic", costUsd: 1.0, date: day1 });
      await insertEvent({ provider: "anthropic", costUsd: 2.5, date: day2 });

      const result = await getAiUsageByProvider({ testSource });

      expect(result).toHaveLength(1);
      expect(result[0].totalUsd).toBe(3.5);
    });
  });

  describe("mixed scenarios", () => {
    it("handles multiple providers across multiple days", async () => {
      const day1 = new Date("2026-01-18T10:00:00Z");
      const day2 = new Date("2026-01-19T10:00:00Z");

      await insertEvent({ provider: "anthropic", costUsd: 1.0, date: day1 });
      await insertEvent({ provider: "openai", costUsd: 0.5, date: day1 });
      await insertEvent({ provider: "anthropic", costUsd: 2.0, date: day2 });
      await insertEvent({ provider: "openai", costUsd: 1.5, date: day2 });

      const byDay = await getAiUsageByDay({ testSource });
      const byProvider = await getAiUsageByProvider({ testSource });

      // By day: day1 = 1.5, day2 = 3.5
      expect(byDay).toHaveLength(2);
      expect(byDay[0]).toEqual({ date: "2026-01-18", totalUsd: 1.5 });
      expect(byDay[1]).toEqual({ date: "2026-01-19", totalUsd: 3.5 });

      // By provider: anthropic = 3.0, openai = 2.0
      expect(byProvider).toHaveLength(2);
      expect(byProvider[0]).toEqual({ provider: "anthropic", totalUsd: 3.0 });
      expect(byProvider[1]).toEqual({ provider: "openai", totalUsd: 2.0 });
    });

    it("ignores events with null cost", async () => {
      const day = new Date("2026-01-18T10:00:00Z");

      await insertEvent({ provider: "anthropic", costUsd: 1.0, date: day });
      // Insert event with null cost directly
      await db.insert(aiCostEvents).values({
        id: crypto.randomUUID(),
        source: testSource,
        provider: "anthropic",
        estimatedCostUsd: null,
        createdAt: day,
      });

      const result = await getAiUsageByDay({ testSource });

      expect(result).toHaveLength(1);
      expect(result[0].totalUsd).toBe(1.0);
    });
  });
});
