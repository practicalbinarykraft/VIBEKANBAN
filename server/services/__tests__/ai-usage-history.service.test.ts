/** TDD tests for ai-usage-history.service.ts (PR-56) */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db, initDB } from "@/server/db";
import { aiCostEvents } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { getAiUsageHistory } from "../ai/ai-usage-history.service";

const TEST_SOURCE = "test-pr56";

describe("ai-usage-history.service", () => {
  beforeAll(() => { initDB(); });

  beforeEach(async () => {
    await db.delete(aiCostEvents).where(eq(aiCostEvents.source, TEST_SOURCE));
  });

  async function insertEvent(opts: {
    provider?: string; model?: string | null; promptTokens?: number | null;
    completionTokens?: number | null; estimatedCostUsd?: number | null;
    createdAt?: Date;
  }) {
    const now = opts.createdAt || new Date();
    await db.insert(aiCostEvents).values({
      id: crypto.randomUUID(), source: TEST_SOURCE,
      provider: opts.provider || "anthropic",
      model: opts.model === undefined ? "claude-sonnet-4-20250514" : opts.model,
      promptTokens: opts.promptTokens === undefined ? 100 : opts.promptTokens,
      completionTokens: opts.completionTokens === undefined ? 50 : opts.completionTokens,
      estimatedCostUsd: opts.estimatedCostUsd === undefined ? 0.01 : opts.estimatedCostUsd,
      createdAt: now,
    });
  }

  describe("getAiUsageHistory", () => {
    it("returns empty array when no events", async () => {
      const result = await getAiUsageHistory({ source: TEST_SOURCE });
      expect(result.items).toEqual([]);
      expect(result.totalUsd).toBe(0);
    });

    it("default limit=50, clamps max=200", async () => {
      for (let i = 0; i < 5; i++) await insertEvent({});
      const r1 = await getAiUsageHistory({ source: TEST_SOURCE });
      expect(r1.items.length).toBe(5);

      const r2 = await getAiUsageHistory({ limit: 2, source: TEST_SOURCE });
      expect(r2.items.length).toBe(2);

      const r3 = await getAiUsageHistory({ limit: 999, source: TEST_SOURCE });
      expect(r3.items.length).toBe(5); // clamped to 200, but only 5 exist
    });

    it("sorts by createdAt DESC", async () => {
      const old = new Date(Date.now() - 60000);
      const recent = new Date();
      await insertEvent({ createdAt: old, model: "old-model" });
      await insertEvent({ createdAt: recent, model: "recent-model" });

      const result = await getAiUsageHistory({ source: TEST_SOURCE });
      expect(result.items[0].model).toBe("recent-model");
      expect(result.items[1].model).toBe("old-model");
    });

    it("days filter works correctly", async () => {
      const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const recent = new Date();
      await insertEvent({ createdAt: old, model: "old" });
      await insertEvent({ createdAt: recent, model: "recent" });

      const result = await getAiUsageHistory({ days: 5, source: TEST_SOURCE });
      expect(result.items.length).toBe(1);
      expect(result.items[0].model).toBe("recent");
    });

    it("totalUsd sums correctly, null treated as 0", async () => {
      await insertEvent({ estimatedCostUsd: 1.5 });
      await insertEvent({ estimatedCostUsd: 2.5 });
      await insertEvent({ estimatedCostUsd: null });

      const result = await getAiUsageHistory({ source: TEST_SOURCE });
      expect(result.totalUsd).toBeCloseTo(4.0, 2);
    });

    it("provider filter works", async () => {
      await insertEvent({ provider: "anthropic" });
      await insertEvent({ provider: "openai" });
      await insertEvent({ provider: "mock" });

      const r1 = await getAiUsageHistory({ provider: "anthropic", source: TEST_SOURCE });
      expect(r1.items.length).toBe(1);
      expect(r1.items[0].provider).toBe("anthropic");

      const r2 = await getAiUsageHistory({ provider: "openai", source: TEST_SOURCE });
      expect(r2.items.length).toBe(1);
    });

    it("returns correct shape for AiUsageItem", async () => {
      await insertEvent({ provider: "anthropic", model: "claude-sonnet-4-20250514",
        promptTokens: 100, completionTokens: 50, estimatedCostUsd: 0.01 });

      const result = await getAiUsageHistory({ source: TEST_SOURCE });
      const item = result.items[0];
      expect(item.id).toBeDefined();
      expect(item.provider).toBe("anthropic");
      expect(item.model).toBe("claude-sonnet-4-20250514");
      expect(item.tokensPrompt).toBe(100);
      expect(item.tokensCompletion).toBe(50);
      expect(item.estimatedCostUsd).toBeCloseTo(0.01, 4);
      expect(item.source).toBe(TEST_SOURCE);
      expect(item.createdAt).toBeInstanceOf(Date);
    });
  });
});
