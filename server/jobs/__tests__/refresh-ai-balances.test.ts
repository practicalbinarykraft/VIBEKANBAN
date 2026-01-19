/**
 * TDD tests for refresh-ai-balances job runner (PR-54)
 *
 * Tests:
 * - run() calls refreshAllProviderBalances()
 * - run() returns results array
 * - run() handles errors gracefully
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the provider-balance.service
vi.mock("@/server/services/providers/provider-balance.service", () => ({
  refreshAllProviderBalances: vi.fn(),
}));

import { refreshAllProviderBalances } from "@/server/services/providers/provider-balance.service";
import { run } from "../refresh-ai-balances";

describe("refresh-ai-balances job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls refreshAllProviderBalances on run()", async () => {
    vi.mocked(refreshAllProviderBalances).mockResolvedValue([
      { provider: "anthropic", balanceUsd: 75, source: "estimator", spendUsd: 25, limitUsd: 100, updatedAt: new Date().toISOString() },
    ]);

    const result = await run();

    expect(refreshAllProviderBalances).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe("anthropic");
  });

  it("returns empty array when service returns empty", async () => {
    vi.mocked(refreshAllProviderBalances).mockResolvedValue([]);
    const result = await run();
    expect(result).toEqual([]);
  });

  it("propagates errors from service", async () => {
    vi.mocked(refreshAllProviderBalances).mockRejectedValue(new Error("DB error"));
    await expect(run()).rejects.toThrow("DB error");
  });
});
