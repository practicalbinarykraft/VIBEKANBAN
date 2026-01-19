/** TDD tests for ai-usage-alerts.service.ts (PR-58) */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { db, initDB } from "@/server/db";
import { aiCostEvents } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { getAiUsageAlerts } from "../ai/ai-usage-alerts.service";

const TEST_SOURCE = "test-pr58";

describe("ai-usage-alerts.service", () => {
  const originalEnv = { ...process.env };

  beforeAll(() => { initDB(); });

  beforeEach(async () => {
    await db.delete(aiCostEvents).where(eq(aiCostEvents.source, TEST_SOURCE));
    delete process.env.ANTHROPIC_MONTHLY_LIMIT_USD;
    delete process.env.OPENAI_MONTHLY_LIMIT_USD;
  });

  afterEach(() => { process.env = { ...originalEnv }; });

  async function insertSpend(provider: string, costUsd: number) {
    await db.insert(aiCostEvents).values({
      id: crypto.randomUUID(), source: TEST_SOURCE, provider,
      estimatedCostUsd: costUsd, createdAt: new Date(),
    });
  }

  describe("getAiUsageAlerts", () => {
    it("returns ok when no limit set", async () => {
      await insertSpend("anthropic", 10);
      const result = await getAiUsageAlerts("anthropic", { testSource: TEST_SOURCE });

      expect(result.status).toBe("ok");
      expect(result.limitUsd).toBeNull();
      expect(result.spendUsd).toBe(10);
      expect(result.percentUsed).toBeNull();
    });

    it("returns ok when spend is 0%", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "100";
      const result = await getAiUsageAlerts("anthropic", { testSource: TEST_SOURCE });

      expect(result.status).toBe("ok");
      expect(result.spendUsd).toBe(0);
      expect(result.percentUsed).toBe(0);
    });

    it("returns ok when spend is under 70%", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "100";
      await insertSpend("anthropic", 50);
      const result = await getAiUsageAlerts("anthropic", { testSource: TEST_SOURCE });

      expect(result.status).toBe("ok");
      expect(result.percentUsed).toBe(50);
      expect(result.threshold).toBeUndefined();
    });

    it("returns warning when spend is 70%", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "100";
      await insertSpend("anthropic", 70);
      const result = await getAiUsageAlerts("anthropic", { testSource: TEST_SOURCE });

      expect(result.status).toBe("warning");
      expect(result.percentUsed).toBe(70);
      expect(result.threshold).toBe(70);
    });

    it("returns critical when spend is 85%", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "100";
      await insertSpend("anthropic", 85);
      const result = await getAiUsageAlerts("anthropic", { testSource: TEST_SOURCE });

      expect(result.status).toBe("critical");
      expect(result.percentUsed).toBe(85);
      expect(result.threshold).toBe(85);
    });

    it("returns blocked when spend is 100%", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "100";
      await insertSpend("anthropic", 100);
      const result = await getAiUsageAlerts("anthropic", { testSource: TEST_SOURCE });

      expect(result.status).toBe("blocked");
      expect(result.percentUsed).toBe(100);
      expect(result.threshold).toBe(100);
    });

    it("returns blocked when spend exceeds limit", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "100";
      await insertSpend("anthropic", 120);
      const result = await getAiUsageAlerts("anthropic", { testSource: TEST_SOURCE });

      expect(result.status).toBe("blocked");
      expect(result.percentUsed).toBe(120);
    });

    it("works for openai provider", async () => {
      process.env.OPENAI_MONTHLY_LIMIT_USD = "50";
      await insertSpend("openai", 43); // 86% -> critical
      const result = await getAiUsageAlerts("openai", { testSource: TEST_SOURCE });

      expect(result.status).toBe("critical");
      expect(result.percentUsed).toBe(86);
      expect(result.limitUsd).toBe(50);
    });

    it("rounds percentUsed to 1 decimal", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "33";
      await insertSpend("anthropic", 25);
      const result = await getAiUsageAlerts("anthropic", { testSource: TEST_SOURCE });

      expect(result.percentUsed).toBe(75.8); // 25/33*100 = 75.757... -> 75.8
    });
  });
});
