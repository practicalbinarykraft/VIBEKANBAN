/**
 * Tests for AI Budget Guard
 *
 * Tests budget limit checking for AI providers.
 * Limits are read from env vars, spend from database.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database module
vi.mock("@/server/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    all: vi.fn(),
  },
}));

import { checkProviderBudget, getMonthlySpend } from "../ai/ai-budget-guard";
import { db } from "@/server/db";

describe("ai-budget-guard", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars
    delete (process.env as Record<string, string | undefined>).ANTHROPIC_MONTHLY_LIMIT_USD;
    delete (process.env as Record<string, string | undefined>).OPENAI_MONTHLY_LIMIT_USD;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getMonthlySpend", () => {
    it("returns 0 when no cost events exist", async () => {
      vi.mocked(db.select().from({} as any).where({} as any).all).mockResolvedValue([]);

      const spend = await getMonthlySpend("anthropic");
      expect(spend).toBe(0);
    });

    it("sums estimated costs for the provider", async () => {
      vi.mocked(db.select().from({} as any).where({} as any).all).mockResolvedValue([
        { estimatedCostUsd: 10.5 },
        { estimatedCostUsd: 5.25 },
        { estimatedCostUsd: null },
        { estimatedCostUsd: 4.25 },
      ]);

      const spend = await getMonthlySpend("anthropic");
      expect(spend).toBe(20);
    });
  });

  describe("checkProviderBudget", () => {
    it("returns allowed with no_limit when limit not set", async () => {
      vi.mocked(db.select().from({} as any).where({} as any).all).mockResolvedValue([]);

      const result = await checkProviderBudget("anthropic");

      expect(result).toEqual({
        allowed: true,
        provider: "anthropic",
        reason: "no_limit",
      });
    });

    it("returns allowed when spend < limit", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "50";
      vi.mocked(db.select().from({} as any).where({} as any).all).mockResolvedValue([
        { estimatedCostUsd: 30 },
      ]);

      const result = await checkProviderBudget("anthropic");

      expect(result).toEqual({
        allowed: true,
        provider: "anthropic",
        reason: "within_limit",
      });
    });

    it("returns blocked when spend >= limit", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "50";
      vi.mocked(db.select().from({} as any).where({} as any).all).mockResolvedValue([
        { estimatedCostUsd: 51.2 },
      ]);

      const result = await checkProviderBudget("anthropic");

      expect(result).toEqual({
        allowed: false,
        provider: "anthropic",
        reason: "limit_exceeded",
        limitUSD: 50,
        spendUSD: 51.2,
      });
    });

    it("returns blocked when spend equals limit exactly", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "50";
      vi.mocked(db.select().from({} as any).where({} as any).all).mockResolvedValue([
        { estimatedCostUsd: 50 },
      ]);

      const result = await checkProviderBudget("anthropic");

      expect(result).toEqual({
        allowed: false,
        provider: "anthropic",
        reason: "limit_exceeded",
        limitUSD: 50,
        spendUSD: 50,
      });
    });

    it("works with openai provider", async () => {
      process.env.OPENAI_MONTHLY_LIMIT_USD = "100";
      vi.mocked(db.select().from({} as any).where({} as any).all).mockResolvedValue([
        { estimatedCostUsd: 150 },
      ]);

      const result = await checkProviderBudget("openai");

      expect(result).toEqual({
        allowed: false,
        provider: "openai",
        reason: "limit_exceeded",
        limitUSD: 100,
        spendUSD: 150,
      });
    });

    it("ignores invalid limit values", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "not-a-number";
      vi.mocked(db.select().from({} as any).where({} as any).all).mockResolvedValue([]);

      const result = await checkProviderBudget("anthropic");

      expect(result).toEqual({
        allowed: true,
        provider: "anthropic",
        reason: "no_limit",
      });
    });

    it("handles zero limit as active limit", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "0";
      vi.mocked(db.select().from({} as any).where({} as any).all).mockResolvedValue([
        { estimatedCostUsd: 0.01 },
      ]);

      const result = await checkProviderBudget("anthropic");

      expect(result).toEqual({
        allowed: false,
        provider: "anthropic",
        reason: "limit_exceeded",
        limitUSD: 0,
        spendUSD: 0.01,
      });
    });
  });
});
