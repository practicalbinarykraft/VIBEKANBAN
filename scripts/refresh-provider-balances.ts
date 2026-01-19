#!/usr/bin/env npx tsx
/**
 * Provider Balance Refresh Worker (PR-52)
 *
 * Standalone script to refresh provider balances.
 * Can be run from CI/cron or locally.
 *
 * Usage:
 *   npx tsx scripts/refresh-provider-balances.ts
 *
 * Sets exit code 0 on success, 1 on failure.
 */

import { initDB } from "../server/db";
import { refreshProviderBalance } from "../server/services/providers/provider-balance.service";

async function main() {
  console.log("🔄 Starting provider balance refresh...\n");

  // Initialize database
  initDB();

  try {
    // Refresh Anthropic balance
    console.log("Refreshing Anthropic balance...");
    const anthropicResult = await refreshProviderBalance("anthropic");
    console.log("✅ Anthropic balance refreshed:");
    console.log(`   Provider: ${anthropicResult.provider}`);
    console.log(`   Balance: ${anthropicResult.balanceUsd !== null ? `$${anthropicResult.balanceUsd.toFixed(2)}` : "N/A"}`);
    console.log(`   Spend: $${anthropicResult.spendUsd.toFixed(2)}`);
    console.log(`   Limit: ${anthropicResult.limitUsd !== null ? `$${anthropicResult.limitUsd.toFixed(2)}` : "N/A"}`);
    console.log(`   Source: ${anthropicResult.source}`);
    console.log(`   Updated: ${anthropicResult.updatedAt}\n`);

    // Note: OpenAI refresh can be added here when needed
    // const openaiResult = await refreshProviderBalance("openai");

    console.log("✅ Provider balance refresh complete.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error refreshing provider balances:", error);
    process.exit(1);
  }
}

main();
