/** TDD tests for provider-balance.service.ts (PR-52, PR-54) */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/server/db";
import { initDB } from "@/server/db";
import { aiCostEvents, providerAccounts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Mock the adapter
vi.mock("../providers/adapters/anthropic-balance.adapter", () => ({
  getAnthropicBalance: vi.fn(),
}));

import { getAnthropicBalance } from "../providers/adapters/anthropic-balance.adapter";
import { refreshProviderBalance, refreshAllProviderBalances } from "../providers/provider-balance.service";

describe("provider-balance.service", () => {
  const originalEnv = { ...process.env };
  let testSource: string;

  beforeEach(async () => {
    testSource = `test-svc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    vi.clearAllMocks(); initDB();
    delete process.env.ANTHROPIC_MONTHLY_LIMIT_USD;
    delete process.env.OPENAI_MONTHLY_LIMIT_USD;
    await db.delete(providerAccounts).where(eq(providerAccounts.provider, "anthropic"));
    await db.delete(providerAccounts).where(eq(providerAccounts.provider, "openai"));
    vi.mocked(getAnthropicBalance).mockResolvedValue({ availableUsd: null, source: "unknown" });
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

  describe("refreshProviderBalance", () => {
    it("uses estimator when adapter returns unknown", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "100";
      await insertCostEvent("anthropic", 25.0);

      const result = await refreshProviderBalance("anthropic", { testSource });

      expect(result.provider).toBe("anthropic");
      expect(result.source).toBe("estimator");
      expect(result.spendUsd).toBe(25.0);
      expect(result.balanceUsd).toBe(75.0); // 100 - 25
      expect(result.limitUsd).toBe(100);
    });

    it("stores balance in provider_accounts", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "50";
      await insertCostEvent("anthropic", 10.0);

      await refreshProviderBalance("anthropic", { testSource });

      const account = await db
        .select()
        .from(providerAccounts)
        .where(eq(providerAccounts.provider, "anthropic"))
        .get();

      expect(account).toBeDefined();
      expect(account!.balanceUsd).toBe(40.0); // 50 - 10
      expect(account!.balanceSource).toBe("estimator");
      expect(account!.monthlyLimitUsd).toBe(50);
      expect(account!.balanceUpdatedAt).toBeDefined();
    });

    it("updates existing provider_accounts record", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "100";

      // First refresh
      await insertCostEvent("anthropic", 10.0);
      await refreshProviderBalance("anthropic", { testSource });

      // Second refresh with more spend
      await insertCostEvent("anthropic", 15.0);
      const result = await refreshProviderBalance("anthropic", { testSource });

      expect(result.spendUsd).toBe(25.0); // 10 + 15
      expect(result.balanceUsd).toBe(75.0); // 100 - 25

      // Should still have one record
      const accounts = await db
        .select()
        .from(providerAccounts)
        .where(eq(providerAccounts.provider, "anthropic"));

      expect(accounts.length).toBe(1);
      expect(accounts[0].balanceUsd).toBe(75.0);
    });

    it("returns null balance when no limit set", async () => {
      delete process.env.ANTHROPIC_MONTHLY_LIMIT_USD;
      await insertCostEvent("anthropic", 30.0);

      const result = await refreshProviderBalance("anthropic", { testSource });

      expect(result.spendUsd).toBe(30.0);
      expect(result.balanceUsd).toBeNull();
      expect(result.limitUsd).toBeNull();
      expect(result.source).toBe("estimator");
    });

    it("returns unknown source when no spend and no limit", async () => {
      delete process.env.ANTHROPIC_MONTHLY_LIMIT_USD;

      const result = await refreshProviderBalance("anthropic", {
        testSource: `empty-${Date.now()}`,
      });

      expect(result.spendUsd).toBe(0);
      expect(result.balanceUsd).toBeNull();
      expect(result.source).toBe("unknown");
    });

    it("uses provider_api source when adapter returns balance", async () => {
      vi.mocked(getAnthropicBalance).mockResolvedValue({
        availableUsd: 150.0,
        source: "provider_api",
      });

      const result = await refreshProviderBalance("anthropic", { testSource });

      expect(result.balanceUsd).toBe(150.0);
      expect(result.source).toBe("provider_api");
    });

    it("includes updatedAt in response", async () => {
      const before = new Date();
      const result = await refreshProviderBalance("anthropic", { testSource });
      const after = new Date();

      expect(result.updatedAt).toBeDefined();
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(new Date(result.updatedAt).getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("stores spendUsdMonthToDate in provider_accounts (PR-54)", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "100";
      await insertCostEvent("anthropic", 25.0);
      await refreshProviderBalance("anthropic", { testSource });

      const account = await db.select().from(providerAccounts)
        .where(eq(providerAccounts.provider, "anthropic")).get();

      expect(account).toBeDefined();
      expect(account!.spendUsdMonthToDate).toBe(25.0);
    });
  });

  describe("refreshAllProviderBalances (PR-54)", () => {
    it("refreshes all configured providers", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "100";
      process.env.OPENAI_MONTHLY_LIMIT_USD = "50";
      await insertCostEvent("anthropic", 10.0);

      const results = await refreshAllProviderBalances({ testSource });

      expect(results).toHaveLength(2);
      expect(results.find((r) => r.provider === "anthropic")).toBeDefined();
      expect(results.find((r) => r.provider === "openai")).toBeDefined();
    });

    it("stores all provider balances in provider_accounts", async () => {
      process.env.ANTHROPIC_MONTHLY_LIMIT_USD = "100";
      await insertCostEvent("anthropic", 20.0);
      await refreshAllProviderBalances({ testSource });

      const accounts = await db.select().from(providerAccounts);
      expect(accounts.length).toBeGreaterThanOrEqual(1);
      const anthropicAcc = accounts.find((a) => a.provider === "anthropic");
      expect(anthropicAcc).toBeDefined();
      expect(anthropicAcc!.balanceUsd).toBe(80.0);
    });
  });
});
